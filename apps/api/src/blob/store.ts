import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

export interface BlobEnregistre {
  readonly uri: string;
  readonly hash: string;
  readonly taille: number;
}

/**
 * Stockage des médias Raw, **hors base** (orientation MPD §G.3).
 * Impl. locale pour le développement ; impl. objet (S3/MinIO) pour le déploiement (ADR-0005 §3).
 */
export interface BlobStore {
  ecrire(cle: string, donnees: Uint8Array): Promise<BlobEnregistre>;
  lire(uri: string): Promise<Uint8Array>;
}

export class LocalBlobStore implements BlobStore {
  constructor(private readonly racine: string) {}

  async ecrire(cle: string, donnees: Uint8Array): Promise<BlobEnregistre> {
    const chemin = join(this.racine, cle);
    await mkdir(dirname(chemin), { recursive: true });
    await writeFile(chemin, donnees);
    return {
      uri: `file://${chemin}`,
      hash: createHash('sha256').update(donnees).digest('hex'),
      taille: donnees.byteLength,
    };
  }

  async lire(uri: string): Promise<Uint8Array> {
    const chemin = uri.startsWith('file://') ? uri.slice('file://'.length) : uri;
    return new Uint8Array(await readFile(chemin));
  }
}

export interface S3BlobStoreConfig {
  endpoint: string;
  bucket: string;
  accessKey?: string | undefined;
  secretKey?: string | undefined;
}

/**
 * Adaptateur de stockage compatible S3 / MinIO (ADR-0005 §3).
 */
export class S3BlobStore implements BlobStore {
  constructor(private readonly config: S3BlobStoreConfig) {}

  async ecrire(cle: string, donnees: Uint8Array): Promise<BlobEnregistre> {
    const hash = createHash('sha256').update(donnees).digest('hex');
    const url = `${this.config.endpoint.replace(/\/$/, '')}/${this.config.bucket}/${cle}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/octet-stream',
      'x-amz-content-sha256': hash,
    };

    if (this.config.accessKey && this.config.secretKey) {
      const basic = Buffer.from(`${this.config.accessKey}:${this.config.secretKey}`).toString('base64');
      headers['Authorization'] = `Basic ${basic}`;
    }

    const response = await fetch(url, {
      method: 'PUT',
      headers,
      body: donnees,
    });

    if (!response.ok) {
      throw new Error(`Échec upload S3/MinIO (${response.status}) : ${await response.text()}`);
    }

    return {
      uri: `s3://${this.config.bucket}/${cle}`,
      hash,
      taille: donnees.byteLength,
    };
  }

  async lire(uri: string): Promise<Uint8Array> {
    const cle = uri.startsWith('s3://')
      ? uri.slice(`s3://${this.config.bucket}/`.length)
      : uri;
    const url = `${this.config.endpoint.replace(/\/$/, '')}/${this.config.bucket}/${cle}`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Échec lecture S3/MinIO (${response.status}) : ${await response.text()}`);
    }

    return new Uint8Array(await response.arrayBuffer());
  }
}

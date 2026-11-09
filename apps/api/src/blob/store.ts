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
 * Impl. locale pour le développement ; une impl. objet (S3/MinIO) sera ajoutée au déploiement,
 * derrière cette même interface.
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

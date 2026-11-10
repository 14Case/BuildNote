import type {
  CapacitesOcr,
  EntreeImage,
  OcrProvider,
  Reconnaissance,
  Structure,
  TypeAttendu,
} from '@buildnote/shared';
import { structureSchema } from '@buildnote/shared';
import { ErreurMetier } from '../errors.js';

export interface HttpOcrConfig {
  readonly endpointUrl: string;
  readonly timeoutMs?: number;
  readonly cleApi?: string;
}

/**
 * Adaptateur OCR HTTP optionnel (Lot L1 / préparation POC 1 & 2).
 * Permet d'appeler un moteur OCR auto-hébergé réel (ex: FastAPI avec Tesseract,
 * EasyOCR ou PaddleOCR) via contrat HTTP REST normalisé.
 *
 * Par défaut, l'application reste sur `MockOcrProvider`.
 */
export class HttpOcrProvider implements OcrProvider {
  readonly nom = 'http-ocr';
  readonly version = '1.0.0';

  constructor(private readonly config: HttpOcrConfig) {}

  async detecterStructure(image: EntreeImage, gabaritId?: string): Promise<Structure> {
    const url = `${this.config.endpointUrl.replace(/\/$/, '')}/detecter-structure`;
    const donneesBase64 = Buffer.from(image.donnees).toString('base64');
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs ?? 15000);

    try {
      const reponse = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.config.cleApi ? { Authorization: `Bearer ${this.config.cleApi}` } : {}),
        },
        body: JSON.stringify({
          image: { donnees: donneesBase64, typeMime: image.typeMime },
          gabaritId,
        }),
        signal: controller.signal,
      });

      if (!reponse.ok) {
        throw new ErreurMetier(
          502,
          'ocr_echec',
          `Le moteur OCR distant a renvoyé une erreur (HTTP ${reponse.status}).`,
        );
      }

      const json = await reponse.json();
      return structureSchema.parse(json);
    } catch (err) {
      if (err instanceof ErreurMetier) throw err;
      throw new ErreurMetier(
        502,
        'ocr_indisponible',
        'Le service OCR distant est injoignable ou en dépassement de délai.',
      );
    } finally {
      clearTimeout(timeout);
    }
  }

  async reconnaitre(zoneImage: EntreeImage, typeAttendu: TypeAttendu): Promise<Reconnaissance> {
    const url = `${this.config.endpointUrl.replace(/\/$/, '')}/reconnaitre`;
    const donneesBase64 = Buffer.from(zoneImage.donnees).toString('base64');
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs ?? 5000);

    try {
      const reponse = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.config.cleApi ? { Authorization: `Bearer ${this.config.cleApi}` } : {}),
        },
        body: JSON.stringify({
          image: { donnees: donneesBase64, typeMime: zoneImage.typeMime },
          typeAttendu,
        }),
        signal: controller.signal,
      });

      if (!reponse.ok) {
        return { texte: '', score: 0, variantes: [], bbox: [0, 0, 0, 0] };
      }

      const json = (await reponse.json()) as Reconnaissance;
      return json;
    } catch {
      return { texte: '', score: 0, variantes: [], bbox: [0, 0, 0, 0] };
    } finally {
      clearTimeout(timeout);
    }
  }

  capacites(): CapacitesOcr {
    return {
      imprime: true,
      manuscrit: true,
      horsLigne: false,
      langues: ['fr', 'en'],
    };
  }
}

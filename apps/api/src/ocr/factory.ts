import type { OcrProvider } from '@buildnote/shared';
import { MockOcrProvider, type MockScenario } from './mock-provider.js';
import { HttpOcrProvider, type HttpOcrConfig } from './http-provider.js';

export interface OptionsFabriqueOcr {
  readonly mode?: 'mock' | 'http';
  readonly httpConfig?: HttpOcrConfig;
  readonly mockScenario?: MockScenario;
}

/**
 * Fabrique d'OcrProvider (ADR-0001 §2, Lot L1).
 * Instancie MockOcrProvider par défaut, ou HttpOcrProvider si explicitement demandé.
 */
export function creerOcrProvider(opts: OptionsFabriqueOcr): OcrProvider {
  if (opts.mode === 'http' && opts.httpConfig?.endpointUrl) {
    return new HttpOcrProvider(opts.httpConfig);
  }

  return new MockOcrProvider(
    opts.mockScenario ?? {
      structure: {
        zones: {
          entete: null,
          tableau: null,
          piedDePage: null,
        },
        nbLignes: 0,
        colonnes: [],
        cellules: [],
        entete: null,
        scoreStructure: 1,
        sansBordure: false,
      },
    },
  );
}

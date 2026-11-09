import type {
  CapacitesOcr,
  EntreeImage,
  OcrProvider,
  Reconnaissance,
  Structure,
  TypeAttendu,
} from '@buildnote/shared';

export interface MockScenario {
  readonly structure: Structure;
}

/**
 * Fournisseur OCR **simulé** (ADR-0001 §2).
 * Ne fait aucune reconnaissance : rejoue un scénario figé construit en amont
 * (cf. `scenario.ts`), à la manière du prototype « Magicien d'Oz » du POC-VH
 * (docs/12-poc/acquisition/verification-humaine.md §V.5).
 *
 * Le jour où un moteur réel est choisi (décision #3, après POC 1 & 2),
 * il implémente la même interface sans impact sur le reste du pipeline.
 */
export class MockOcrProvider implements OcrProvider {
  readonly nom = 'mock';
  readonly version = '0.1.0';

  constructor(private readonly scenario: MockScenario) {}

  async detecterStructure(_image: EntreeImage, _gabaritId?: string): Promise<Structure> {
    return this.scenario.structure;
  }

  async reconnaitre(_zoneImage: EntreeImage, _typeAttendu: TypeAttendu): Promise<Reconnaissance> {
    // Les cellules sont déjà dans la structure ; cette méthode n'est pas utilisée par le
    // service d'extraction du mock, mais le contrat l'exige.
    return { texte: '', score: 0, variantes: [], bbox: [0, 0, 0, 0] };
  }

  capacites(): CapacitesOcr {
    return { imprime: true, manuscrit: true, horsLigne: true, langues: ['fr', 'en'] };
  }
}

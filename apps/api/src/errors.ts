/** Erreur métier portant un statut HTTP et un code stable (exploitable par le front). */
export class ErreurMetier extends Error {
  constructor(
    readonly statut: number,
    readonly code: string,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ErreurMetier';
  }
}

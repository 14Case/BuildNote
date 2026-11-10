import { fr, en, type MessageKey } from '@buildnote/shared';

const CODE_VERS_I18N: Record<string, MessageKey> = {
  lot_introuvable: 'error.lotNotFound',
  enseignement_introuvable: 'error.teachingNotFound',
  evaluation_introuvable: 'error.evaluationNotFound',
  lot_deja_valide: 'error.lotAlreadyValidated',
  fichier_absent: 'error.fileMissing',
  taille_trop_grande: 'error.fileTooLarge',
  quota_depasse: 'error.quotaExceeded',
  type_non_supporte: 'error.unsupportedMediaType',
  aucun_media: 'error.noMedia',
  extraction_absente: 'error.extractionMissing',
  formulaire_perime: 'error.staleForm',
  idempotency_key_reutilisee: 'error.idempotencyReused',
  role_insuffisant: 'error.insufficientRole',
  validation: 'error.validation',
  interne: 'error.internal',
  acces_interdit: 'error.forbidden',
};

/**
 * Traduit un code d'erreur selon la langue demandée (FR par défaut, EN).
 */
export function obtenirMessageErreur(code: string, langue: 'fr' | 'en' = 'fr', fallback?: string): string {
  const cle = CODE_VERS_I18N[code];
  if (cle) {
    return langue === 'en' ? en[cle] : fr[cle];
  }
  return fallback ?? (langue === 'en' ? en['error.generic'] : fr['error.generic']);
}

/** Erreur métier portant un statut HTTP, un code stable et un message bilingue. */
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

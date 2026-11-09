/**
 * Point d'entrée de @buildnote/shared : modèle canonique + contrats d'API partagés.
 * Les deux modules ne partagent QUE ce paquet (architecture-fonctionnelle §E.6).
 */

/* Socle commun — Module 1 (acquisition) */
export * from './domain/bareme.js';
export * from './domain/valeur.js';
export * from './domain/confidence.js';
export * from './contracts/ocr.js';
export * from './contracts/acquisition.js';
export * as i18n from './i18n/index.js';

/* Module 2 — orientation */
export * from './orientation/index.js';
export * as orientation from './orientation/index.js';

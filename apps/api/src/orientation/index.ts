/**
 * Service orientation (Module 2). Voir docs/09-moteur-orientation/ et ADR-0003.
 * Toutes les frontières à risque sont derrière une interface : `OrientationDataGateway`,
 * `ReferentialProvider`, `PonderationsProvider`.
 */
export * from './gateway.js';
export * from './referential.js';
export * from './profiler.js';
export * from './candidates.js';
export * from './scorer.js';
export * from './rules.js';
export * from './explain.js';
export * from './assemble.js';
export * from './service.js';
export * from './fixtures.js';

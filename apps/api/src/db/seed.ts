/**
 * Script de seed (dev). Données NON réelles — cf. ADR-0001 §1.
 * Idempotent : relancer réinitialise le jeu de démo dans `apps/api/.data/db`.
 */
import { chargerConfig } from '../config.js';
import { creerBase } from './client.js';
import { seedDemo } from './seed-demo.js';

const config = chargerConfig();
if (config.enMemoire) {
  console.error('PGLITE_PATH est vide : le seed en mémoire serait perdu. Définissez PGLITE_PATH.');
  process.exit(1);
}

const { db, pg, close } = await creerBase(config.PGLITE_PATH);
const info = await seedDemo(db, pg, { purge: true });
await close();

console.log('✓ Jeu de démonstration créé.');
console.log(`  Établissement      : ${info.etablissementId}`);
console.log(`  Jeton enseignant   : ${info.jetonEnseignant}`);
console.log(`  Jeton responsable  : ${info.jetonResponsable}`);
console.log(`  Enseignement 3e 2  : ${info.enseignementId}`);
console.log(`  Évaluations        : ${info.evaluationIds.join(' · ')}`);

import { randomUUID } from 'node:crypto';
import type { PGlite } from '@electric-sql/pglite';
import type { Db } from './client.js';
import * as t from './schema.js';
import { normaliserNom } from '../services/matching.js';

const NOMS = [
  ['NKOLO', 'Aristide'],
  ['ABENA', 'Clarisse'],
  ['MBALLA ONDOA', 'Jean Pierre'],
  ['ETONG', 'Marie'],
  ['KAMGA', 'Yao'],
  ['TCHOUMI', 'Bertrand'],
  ['NGO BELL', 'Sandrine'],
  ['FOKO', 'Ivan'],
  ['ATANGANA', 'Rose'],
  ['DJOMO', 'Patrick'],
  ['MANGA', 'Estelle'],
  ['BILOA', 'Serge'],
  ['NOAH', 'Christelle'],
  ['ESSOMBA', 'Landry'],
  ['MOUKOURI', 'Diane'],
  ['NANA', 'Gaël'],
  ['OWONA', 'Prisca'],
  ['SISSOKO', 'Amadou'],
  ['ZANG', 'Léonie'],
  ['BEKONO', 'Hervé'],
] as const;

export interface SeedInfo {
  etablissementId: string;
  jetonEnseignant: string;
  jetonResponsable: string;
  enseignementId: string;
  evaluationIds: [string, string];
  classeId: string;
  eleveIds: string[];
}

const TABLES_DANS_L_ORDRE_INVERSE = [
  'evenement_audit',
  'idempotence',
  'validation',
  'appreciation',
  'note',
  'cellule_reconnue',
  'extraction_ocr',
  'page_document',
  'document_source',
  'lot_saisie',
  'evaluation',
  'bareme',
  'enseignement',
  'inscription',
  'eleve',
  'enseignant',
  'personne',
  'classe',
  'annee_scolaire',
  'matiere',
  'utilisateur',
  'etablissement',
];

export interface SeedOptions {
  /** Suffixe pour les jetons et le code établissement (permet de semer plusieurs tenants). */
  readonly suffixe?: string;
  /** `true` ⇒ purge préalable de toutes les tables (idempotence du script de seed). */
  readonly purge?: boolean;
}

/** Insère le jeu de démonstration. */
export async function seedDemo(db: Db, pg?: PGlite, options: SeedOptions = {}): Promise<SeedInfo> {
  if (pg && options.purge) {
    for (const table of TABLES_DANS_L_ORDRE_INVERSE) await pg.exec(`DELETE FROM ${table};`);
  }
  const sfx = options.suffixe ? `-${options.suffixe}` : '';

  const etablissementId = randomUUID();
  await db.insert(t.etablissement).values({
    id: etablissementId,
    nom: `Collège pilote de démonstration${sfx}`,
    type: 'college',
    pays: 'CM',
    code: `DEMO${sfx || '-A'}`,
  });

  const jetonEnseignant = `dev-enseignant-token${sfx}`;
  const jetonResponsable = `dev-responsable-token${sfx}`;
  await db.insert(t.utilisateur).values([
    { id: randomUUID(), etablissementId, nom: 'Amélie N.', email: 'amelie@demo.cm', role: 'enseignant', jetonDev: jetonEnseignant },
    { id: randomUUID(), etablissementId, nom: 'M. le Directeur', email: 'dir@demo.cm', role: 'responsable', jetonDev: jetonResponsable },
  ]);

  const anneeId = randomUUID();
  await db.insert(t.anneeScolaire).values({ id: anneeId, etablissementId, libelle: '2025-2026', active: true });

  const classeId = randomUUID();
  await db.insert(t.classe).values({ id: classeId, etablissementId, anneeScolaireId: anneeId, libelle: '3e 2', effectif: NOMS.length });

  const matiereId = randomUUID();
  await db.insert(t.matiere).values({ id: matiereId, etablissementId, libelleFr: 'Mathématiques', libelleEn: 'Mathematics' });

  const profId = randomUUID();
  await db.insert(t.personne).values({ id: profId, etablissementId, nom: 'MENGUE', prenoms: 'Alice', nomNormalise: normaliserNom('MENGUE Alice') });
  await db.insert(t.enseignant).values({ id: profId });

  const enseignementId = randomUUID();
  await db.insert(t.enseignement).values({ id: enseignementId, etablissementId, classeId, matiereId, enseignantId: profId, coefficient: '2' });

  const eleveIds: string[] = [];
  for (const [nom, prenoms] of NOMS) {
    const pid = randomUUID();
    eleveIds.push(pid);
    await db.insert(t.personne).values({ id: pid, etablissementId, nom, prenoms, nomNormalise: normaliserNom(`${nom} ${prenoms}`) });
    await db.insert(t.eleve).values({ id: pid, matricule: `M-${1000 + eleveIds.length}`, codeNational: null });
    await db.insert(t.inscription).values({ id: randomUUID(), etablissementId, eleveId: pid, classeId, anneeScolaireId: anneeId, statut: 'active' });
  }

  const baremeId = randomUUID();
  await db.insert(t.bareme).values({ id: baremeId, etablissementId, type: 'sur_20', min: '0', max: '20', pas: '0.25' });

  const eval1 = randomUUID();
  const eval2 = randomUUID();
  await db.insert(t.evaluation).values([
    { id: eval1, etablissementId, enseignementId, baremeId, type: 'devoir', date: '2025-11-14', libelle: 'Devoir n°2' },
    { id: eval2, etablissementId, enseignementId, baremeId, type: 'composition', date: '2025-12-05', libelle: 'Composition T1' },
  ]);

  return {
    etablissementId,
    jetonEnseignant,
    jetonResponsable,
    enseignementId,
    evaluationIds: [eval1, eval2],
    classeId,
    eleveIds,
  };
}

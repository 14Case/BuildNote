import { and, eq, isNull } from 'drizzle-orm';
import type { CanoniqueLotImport } from '@buildnote/shared';
import type { Db } from '../db/client.js';
import * as t from '../db/schema.js';

/**
 * Service d'export de réversibilité (Lot L5).
 * Réf. docs/07-interoperabilite/export-reversibilite.md et architecture-detaillee.md §H.7.
 *
 * Exporte l'intégralité du patrimoine de données d'un établissement au format
 * canonique v1 documenté et ré-importable.
 */
export async function exporterPatrimoineEtablissement(
  db: Db,
  etablissementId: string,
): Promise<CanoniqueLotImport> {
  // 1. Année scolaire active
  const [anneeActive] = await db
    .select()
    .from(t.anneeScolaire)
    .where(
      and(
        eq(t.anneeScolaire.etablissementId, etablissementId),
        eq(t.anneeScolaire.active, true),
      ),
    );

  const anneeLibelle = anneeActive?.libelle ?? '2024-2025';

  // 2. Classes
  const classesRows = await db
    .select()
    .from(t.classe)
    .where(eq(t.classe.etablissementId, etablissementId));

  const classes = classesRows.map((c) => ({
    libelle: c.libelle,
    niveau: c.libelle.split(' ')[0] ?? '3eme',
    anneeScolaire: anneeLibelle,
  }));

  // 3. Matières
  const matieresRows = await db
    .select()
    .from(t.matiere)
    .where(eq(t.matiere.etablissementId, etablissementId));

  const matieres = matieresRows.map((m) => ({
    code: m.libelleFr.toUpperCase().replace(/\s+/g, '_'),
    libelleFr: m.libelleFr,
    libelleEn: m.libelleEn,
    coefficientDefaut: 1,
  }));

  // 4. Élèves
  const elevesRows = await db
    .select({
      id: t.eleve.id,
      matricule: t.eleve.matricule,
      codeNational: t.eleve.codeNational,
      nom: t.personne.nom,
      prenoms: t.personne.prenoms,
      dateNaissance: t.personne.dateNaissance,
      classeLibelle: t.classe.libelle,
    })
    .from(t.inscription)
    .innerJoin(t.eleve, eq(t.eleve.id, t.inscription.eleveId))
    .innerJoin(t.personne, eq(t.personne.id, t.eleve.id))
    .innerJoin(t.classe, eq(t.classe.id, t.inscription.classeId))
    .where(eq(t.inscription.etablissementId, etablissementId));

  const eleves = elevesRows.map((e) => ({
    matricule: e.matricule ?? undefined,
    codeNational: e.codeNational ?? undefined,
    nom: e.nom,
    prenoms: e.prenoms,
    sexe: 'non_precise' as const,
    dateNaissance: e.dateNaissance ? String(e.dateNaissance) : undefined,
    classeLibelle: e.classeLibelle,
    anneeScolaire: anneeLibelle,
  }));

  // 5. Évaluations
  const evalsRows = await db
    .select({
      id: t.evaluation.id,
      libelle: t.evaluation.libelle,
      type: t.evaluation.type,
      date: t.evaluation.date,
      classeLibelle: t.classe.libelle,
      matiereLibelleFr: t.matiere.libelleFr,
      baremeMax: t.bareme.max,
    })
    .from(t.evaluation)
    .innerJoin(t.enseignement, eq(t.enseignement.id, t.evaluation.enseignementId))
    .innerJoin(t.classe, eq(t.classe.id, t.enseignement.classeId))
    .innerJoin(t.matiere, eq(t.matiere.id, t.enseignement.matiereId))
    .innerJoin(t.bareme, eq(t.bareme.id, t.evaluation.baremeId))
    .where(eq(t.evaluation.etablissementId, etablissementId));

  const evaluations = evalsRows.map((ev) => ({
    idInterne: ev.id,
    classeLibelle: ev.classeLibelle,
    matiereCode: ev.matiereLibelleFr.toUpperCase().replace(/\s+/g, '_'),
    anneeScolaire: anneeLibelle,
    periode: 'T1' as const,
    type: (ev.type as any) ?? 'devoir',
    libelle: ev.libelle,
    date: ev.date ? String(ev.date) : undefined,
    baremeMax: Number(ev.baremeMax ?? 20),
  }));

  // 6. Notes validées
  const notesRows = await db
    .select({
      valeur: t.note.valeur,
      statut: t.note.statut,
      nom: t.personne.nom,
      prenoms: t.personne.prenoms,
      matricule: t.eleve.matricule,
      classeLibelle: t.classe.libelle,
      matiereLibelleFr: t.matiere.libelleFr,
      evalLibelle: t.evaluation.libelle,
    })
    .from(t.note)
    .innerJoin(t.inscription, eq(t.inscription.id, t.note.inscriptionId))
    .innerJoin(t.eleve, eq(t.eleve.id, t.inscription.eleveId))
    .innerJoin(t.personne, eq(t.personne.id, t.eleve.id))
    .innerJoin(t.classe, eq(t.classe.id, t.inscription.classeId))
    .innerJoin(t.evaluation, eq(t.evaluation.id, t.note.evaluationId))
    .innerJoin(t.enseignement, eq(t.enseignement.id, t.evaluation.enseignementId))
    .innerJoin(t.matiere, eq(t.matiere.id, t.enseignement.matiereId))
    .where(
      and(
        eq(t.note.etablissementId, etablissementId),
        isNull(t.note.statut),
      ),
    );

  const notes = notesRows.map((n) => ({
    eleveMatricule: n.matricule ?? undefined,
    eleveNom: n.nom,
    elevePrenoms: n.prenoms,
    classeLibelle: n.classeLibelle,
    matiereCode: n.matiereLibelleFr.toUpperCase().replace(/\s+/g, '_'),
    evaluationLibelle: n.evalLibelle,
    anneeScolaire: anneeLibelle,
    valeur: n.valeur !== null ? Number(n.valeur) : null,
    statut: (n.statut === 'absent' ? 'absent' : 'note') as 'note' | 'absent',
  }));

  return {
    versionSchema: 'v1',
    source: `export-reversibilite-${etablissementId}`,
    anneeScolaire: anneeLibelle,
    eleves,
    classes,
    matieres,
    evaluations,
    notes,
  };
}

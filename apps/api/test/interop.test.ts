import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { and, eq } from 'drizzle-orm';
import { canoniqueLotImportSchema } from '@buildnote/shared';
import * as t from '../src/db/schema.js';
import { auth, creerBancEssai, type BancEssai } from './helpers.js';
import { parserContenuTabulaire } from '../src/interop/parser.js';

let banc: BancEssai;

beforeAll(async () => {
  banc = await creerBancEssai();
}, 60000);

afterAll(async () => {
  if (banc) {
    await banc.fermer();
  }
});

describe('Lot L5 — Interopérabilité, modèle canonique, mapping et réversibilité', () => {
  const CSV_ARCHETYPE_B = [
    'Matricule;Nom & Prénom;Mathématiques;Français;Anglais;Moyenne',
    'MAT-001;FOTSO Jean;16,5;14;12,5;14,33',
    'MAT-002;NGUEMA Marie;12;15,5;17;14,83',
    'MAT-003;BIKIE Paul;ABS;11;13;12,0',
  ].join('\n');

  it('Parser tabulaire : détection automatique du délimiteur point-virgule et extraction des lignes', () => {
    const res = parserContenuTabulaire(CSV_ARCHETYPE_B);
    expect(res.delimiteur).toBe(';');
    expect(res.enTetes).toEqual(['Matricule', 'Nom & Prénom', 'Mathématiques', 'Français', 'Anglais', 'Moyenne']);
    expect(res.totalLignes).toBe(3);
    expect(res.lignes[0]!['Nom & Prénom']).toBe('FOTSO Jean');
    expect(res.lignes[0]!['Mathématiques']).toBe('16,5');
    expect(res.lignes[2]!['Mathématiques']).toBe('ABS');
  });

  it('API POST /api/v1/interop/import/apercu : aperçu d’un fichier pour assistance au mapping (H.3.4)', async () => {
    const { app, seed } = banc;

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/interop/import/apercu',
      headers: auth(seed.jetonResponsable),
      payload: {
        contenuFichier: CSV_ARCHETYPE_B,
      },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.delimiteur).toBe(';');
    expect(body.enTetes).toContain('Mathématiques');
    expect(body.totalLignes).toBe(3);
    expect(body.echantillon.length).toBe(3);
  });

  it('API POST /api/v1/interop/import/executer : import réel d’un fichier CSV croisé (Archétype B)', async () => {
    const { app, database, seed } = banc;

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/interop/import/executer',
      headers: auth(seed.jetonResponsable),
      payload: {
        contenuFichier: CSV_ARCHETYPE_B,
        nomFichier: 'notes_trimestre1.csv',
        anneeScolaire: '2025-2026',
        classeLibelle: '3e 2',
      },
    });

    expect(res.statusCode).toBe(200);
    const rapport = res.json();
    expect(rapport.statut).toBe('termine');
    expect(rapport.elevesTraites).toBeGreaterThanOrEqual(1);
    expect(rapport.notesInserees).toBeGreaterThanOrEqual(1);
    expect(rapport.lignesConflit).toBe(0);

    // Vérifier en base que les élèves et notes existent
    const [eleveFotso] = await database.db
      .select()
      .from(t.personne)
      .where(eq(t.personne.nom, 'FOTSO'));
    expect(eleveFotso).toBeDefined();

    // Vérifier la traçabilité lineage (H.6)
    const lignages = await database.db
      .select()
      .from(t.donneeLineage)
      .where(eq(t.donneeLineage.importLotId, rapport.importLotId));
    expect(lignages.length).toBe(rapport.notesInserees);
  });

  it('Idempotence : un ré-import du même fichier ne duplique aucune note', async () => {
    const { app, seed } = banc;

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/interop/import/executer',
      headers: auth(seed.jetonResponsable),
      payload: {
        contenuFichier: CSV_ARCHETYPE_B,
        nomFichier: 'notes_trimestre1.csv',
        anneeScolaire: '2025-2026',
        classeLibelle: '3e 2',
      },
    });

    expect(res.statusCode).toBe(200);
    const rapport = res.json();
    expect(rapport.statut).toBe('termine');
    expect(rapport.notesInserees).toBe(0);
    expect(rapport.notesIgnoreesOuIdentiques).toBeGreaterThanOrEqual(1);
  });

  it('Gestion de la quarantaine : les notes aberrantes (> 20) sont isolées en quarantaine (H.4.3)', async () => {
    const { app, database, seed } = banc;

    const CSV_AVEC_ANOMALIE = [
      'Matricule;Nom & Prénom;Mathématiques',
      'MAT-009;KAMGA Luc;25,5', // note > 20 hors barème
    ].join('\n');

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/interop/import/executer',
      headers: auth(seed.jetonResponsable),
      payload: {
        contenuFichier: CSV_AVEC_ANOMALIE,
        nomFichier: 'anomalie.csv',
        anneeScolaire: '2025-2026',
        classeLibelle: '3e 2',
      },
    });

    expect(res.statusCode).toBe(200);
    const rapport = res.json();
    expect(rapport.statut).toBe('partiel');
    expect(rapport.lignesQuarantaine).toBeGreaterThanOrEqual(1);

    const quarantaines = await database.db
      .select()
      .from(t.importQuarantaine)
      .where(eq(t.importQuarantaine.importLotId, rapport.importLotId));
    expect(quarantaines.length).toBeGreaterThanOrEqual(1);
    expect(quarantaines[0]!.statut).toBe('en_quarantaine');
  });

  it('GARDE-FOU NON NÉGOCIABLE (EF-M1-16 / H.5.3) : aucune note validée Module 1 n’est écrasée silencieusement par un import', async () => {
    const { app, database, seed } = banc;

    // 1. Trouver la note déjà importée pour FOTSO en Mathématiques
    const [noteFotso] = await database.db
      .select({
        id: t.note.id,
        valeur: t.note.valeur,
        evaluationId: t.note.evaluationId,
        inscriptionId: t.note.inscriptionId,
      })
      .from(t.note)
      .innerJoin(t.inscription, eq(t.inscription.id, t.note.inscriptionId))
      .innerJoin(t.eleve, eq(t.eleve.id, t.inscription.eleveId))
      .innerJoin(t.personne, eq(t.personne.id, t.eleve.id))
      .where(
        and(
          eq(t.note.etablissementId, seed.etablissementId),
          eq(t.personne.nom, 'FOTSO'),
        ),
      );
    expect(noteFotso).toBeDefined();

    // 2. Marquer cette note comme validée par le Module 1 (origine: 'ocr') avec une note de 14.50
    await database.db
      .update(t.note)
      .set({
        valeur: '14.50',
        origine: 'ocr', // note validée par Module 1 protégée
      })
      .where(eq(t.note.id, noteFotso!.id));

    // 3. Tenter un import avec une valeur divergente (18.0) pour ce même élève et cette même évaluation
    const CSV_CONFLIT = [
      'Matricule;Nom & Prénom;Mathématiques',
      'MAT-001;FOTSO Jean;18,0',
    ].join('\n');

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/interop/import/executer',
      headers: auth(seed.jetonResponsable),
      payload: {
        contenuFichier: CSV_CONFLIT,
        nomFichier: 'conflit_test.csv',
        anneeScolaire: '2025-2026',
        classeLibelle: '3e 2',
      },
    });

    expect(res.statusCode).toBe(200);
    const rapport = res.json();
    expect(rapport.statut).toBe('partiel');
    expect(rapport.lignesConflit).toBe(1);

    // 4. GARDE-FOU : Vérifier que la note en base n'a PAS été modifiée (toujours 14.50, origine 'ocr')
    const [noteApres] = await database.db
      .select()
      .from(t.note)
      .where(eq(t.note.id, noteFotso!.id));
    expect(Number(noteApres!.valeur)).toBe(14.5);
    expect(noteApres!.origine).toBe('ocr');

    // 5. Vérifier qu'une entrée de quarantaine de conflit a été créée
    const [quarantaine] = await database.db
      .select()
      .from(t.importQuarantaine)
      .where(eq(t.importQuarantaine.importLotId, rapport.importLotId));
    expect(quarantaine).toBeDefined();
    expect(quarantaine!.motifCode).toBe('protection_note_module1_validee');
    expect(quarantaine!.statut).toBe('en_quarantaine');
  });

  it('API GET /api/v1/interop/qualite : tableau de bord qualité des données (H.9)', async () => {
    const { app, seed } = banc;

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/interop/qualite',
      headers: auth(seed.jetonResponsable),
    });

    expect(res.statusCode).toBe(200);
    const qualite = res.json();
    expect(qualite.nbImports).toBeGreaterThanOrEqual(1);
    expect(qualite.totalLignesTraitees).toBeGreaterThanOrEqual(1);
    expect(typeof qualite.tauxQuarantainePct).toBe('number');
    expect(typeof qualite.tauxConflitsPct).toBe('number');
  });

  it('API GET /api/v1/interop/export/reversibilite : export de réversibilité complet conforme au schéma canonique v1 (H.7)', async () => {
    const { app, seed } = banc;

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/interop/export/reversibilite',
      headers: auth(seed.jetonResponsable),
    });

    expect(res.statusCode).toBe(200);
    const exportData = res.json();

    // Valider par le schéma canonique Zod
    const parse = canoniqueLotImportSchema.safeParse(exportData);
    expect(parse.success).toBe(true);
    if (!parse.success) {
      console.error(parse.error);
    }
    expect(exportData.versionSchema).toBe('v1');
    expect(exportData.classes.length).toBeGreaterThanOrEqual(1);
    expect(exportData.matieres.length).toBeGreaterThanOrEqual(1);
    expect(exportData.eleves.length).toBeGreaterThanOrEqual(1);
  });
});

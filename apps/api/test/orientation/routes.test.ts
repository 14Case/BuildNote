import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { CATEGORIES_SCORE } from '@buildnote/shared';
import * as t from '../../src/db/schema.js';
import { seedDemo } from '../../src/db/seed-demo.js';
import { auth, creerBancEssai, type BancEssai } from '../helpers.js';

let banc: BancEssai;

beforeAll(async () => {
  banc = await creerBancEssai();
}, 60000);

afterAll(async () => {
  if (banc) {
    await banc.fermer();
  }
});

describe('Module 2 — API d’orientation et intégration base réelle (Lot L3)', () => {
  it('EF-M2-11 : la génération d’un dossier sans consentement est strictement refusée (HTTP 403)', async () => {
    const { app, database, seed } = banc;
    const [classe] = await database.db.select().from(t.classe).where(eq(t.classe.id, seed.classeId));
    const anneeScolaireId = classe!.anneeScolaireId;
    const eleveId = seed.eleveIds[0]!;

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/orientation/dossiers',
      headers: auth(seed.jetonEnseignant),
      payload: {
        eleveId,
        anneeScolaireId,
        langue: 'fr',
      },
    });

    expect(res.statusCode).toBe(403);
    expect(res.json().code).toBe('consentement_requis');
  });

  it('Questionnaire & Consentement : enregistrement et restitution pour l’élève', async () => {
    const { app, database, seed } = banc;
    const [classe] = await database.db.select().from(t.classe).where(eq(t.classe.id, seed.classeId));
    const anneeScolaireId = classe!.anneeScolaireId;
    const eleveId = seed.eleveIds[0]!;

    // 1. Mise à jour questionnaire et consentement (élève + parents)
    const putRes = await app.inject({
      method: 'PUT',
      url: `/api/v1/orientation/eleves/${eleveId}/questionnaire`,
      headers: auth(seed.jetonEnseignant),
      payload: {
        anneeScolaireId,
        consentementEleve: true,
        consentementParents: true,
        centresInteret: ['robotique', 'informatique'],
        matieresPreferees: ['Mathématiques', 'Physique'],
        aspirationsMetiers: ['met-data', 'met-ing'],
        avisParents: { filieres_souhaitees: ['fil-sciences'], priorite: 4 },
      },
    });
    expect(putRes.statusCode).toBe(200);

    // 2. Lecture du questionnaire
    const getRes = await app.inject({
      method: 'GET',
      url: `/api/v1/orientation/eleves/${eleveId}/questionnaire?anneeScolaireId=${anneeScolaireId}`,
      headers: auth(seed.jetonEnseignant),
    });
    expect(getRes.statusCode).toBe(200);
    const body = getRes.json();
    expect(body.consentement.eleve).toBe(true);
    expect(body.consentement.parents).toBe(true);
    expect(body.questionnaire.centresInteret).toEqual(['robotique', 'informatique']);
    expect(body.questionnaire.avisParents.filieres_souhaitees).toEqual(['fil-sciences']);
  });

  it('EF-M2-10/16/18 : Génération d’un dossier explicable à la demande avec notes Normalized', async () => {
    const { app, database, seed } = banc;
    const [classe] = await database.db.select().from(t.classe).where(eq(t.classe.id, seed.classeId));
    const anneeScolaireId = classe!.anneeScolaireId;
    const eleveId = seed.eleveIds[0]!;

    // Insérer des notes validées en base (Normalized) pour cet élève
    const [inscr] = await database.db
      .select()
      .from(t.inscription)
      .where(eq(t.inscription.eleveId, eleveId));

    const [enseignantUser] = await database.db
      .select()
      .from(t.utilisateur)
      .where(eq(t.utilisateur.jetonDev, seed.jetonEnseignant));

    await database.db.insert(t.note).values({
      id: '00000000-0000-0000-0000-000000000101',
      etablissementId: seed.etablissementId,
      evaluationId: seed.evaluationIds[0],
      inscriptionId: inscr!.id,
      valeur: '16.5',
      statut: null,
      lotSaisieId: null,
      origine: 'manuel',
      creePar: enseignantUser!.id,
    });

    // Enregistrer le consentement
    await app.inject({
      method: 'PUT',
      url: `/api/v1/orientation/eleves/${eleveId}/questionnaire`,
      headers: auth(seed.jetonEnseignant),
      payload: {
        anneeScolaireId,
        consentementEleve: true,
        consentementParents: true,
        centresInteret: ['informatique'],
        matieresPreferees: ['Mathématiques'],
        aspirationsMetiers: ['met-data'],
        avisParents: { filieres_souhaitees: ['fil-sciences'], priorite: 4 },
      },
    });

    const nbNotesAvant = (await database.db.select().from(t.note)).length;

    // Déclencher la génération d'orientation
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/orientation/dossiers',
      headers: auth(seed.jetonEnseignant),
      payload: {
        eleveId,
        anneeScolaireId,
        langue: 'fr',
      },
    });

    expect(res.statusCode).toBe(201);
    const dossier = res.json();
    expect(dossier.id).toBeDefined();
    expect(dossier.scenarios.length).toBeGreaterThan(0);
    expect(dossier.synthese).toBeDefined();

    // EF-M2-25 : AUCUNE écriture dans Normalized (note)
    const nbNotesApres = (await database.db.select().from(t.note)).length;
    expect(nbNotesApres).toBe(nbNotesAvant);

    // EF-M2-18 : Explicabilité - traçabilité complète des contributions et répartition
    for (const sc of dossier.scenarios) {
      const expl = sc.explication;
      expect(expl.donnees_utilisees.length).toBeGreaterThan(0);
      expect(Object.keys(expl.repartition_score.parts).sort()).toEqual(
        [...CATEGORIES_SCORE].sort(),
      );
      const sommeContributions = expl.facteurs_determinants.reduce(
        (s: number, f: { contribution: number }) => s + f.contribution,
        0,
      );
      expect(sommeContributions).toBeGreaterThan(0);
      expect(sommeContributions).toBeLessThanOrEqual(sc.scenario.score + 1);
    }

    // Récupération par ID
    const getDossier = await app.inject({
      method: 'GET',
      url: `/api/v1/orientation/dossiers/${dossier.id}`,
      headers: auth(seed.jetonEnseignant),
    });
    expect(getDossier.statusCode).toBe(200);
    expect(getDossier.json().id).toBe(dossier.id);

    // Liste des dossiers de l'élève
    const listeDossiers = await app.inject({
      method: 'GET',
      url: `/api/v1/orientation/eleves/${eleveId}/dossiers`,
      headers: auth(seed.jetonEnseignant),
    });
    expect(listeDossiers.statusCode).toBe(200);
    expect(listeDossiers.json().length).toBeGreaterThanOrEqual(1);
  });

  it('EF-SOC-06 : Cloisonnement multi-tenant — un établissement B ne peut pas générer ni consulter les dossiers de A', async () => {
    const { app, database, seed } = banc;
    const autre = await seedDemo(database.db, undefined, { suffixe: 'B' });

    const [classe] = await database.db.select().from(t.classe).where(eq(t.classe.id, seed.classeId));
    const anneeScolaireId = classe!.anneeScolaireId;
    const eleveIdA = seed.eleveIds[0]!;

    // Tentative d'accès depuis l'établissement B vers l'élève de A
    const vol = await app.inject({
      method: 'POST',
      url: '/api/v1/orientation/dossiers',
      headers: auth(autre.jetonEnseignant),
      payload: {
        eleveId: eleveIdA,
        anneeScolaireId,
        langue: 'fr',
      },
    });

    expect(vol.statusCode).toBe(404);
    expect(vol.json().code).toBe('eleve_introuvable');
  });
});

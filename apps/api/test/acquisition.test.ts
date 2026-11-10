import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import * as t from '../src/db/schema.js';
import { seedDemo } from '../src/db/seed-demo.js';
import { creerBancEssai, auth, type BancEssai } from './helpers.js';

let banc: BancEssai;

beforeEach(async () => {
  banc = await creerBancEssai();
});
afterEach(async () => {
  await banc.fermer();
});

/** Téléverse un média (corps binaire brut). */
async function televerser(lotId: string, jeton: string) {
  return banc.app.inject({
    method: 'POST',
    url: `/api/v1/lots/${lotId}/documents`,
    headers: { ...auth(jeton), 'content-type': 'image/jpeg' },
    payload: Buffer.from([1, 2, 3, 4, 5, 6]),
  });
}

async function extraire(lotId: string, jeton: string) {
  return banc.app.inject({
    method: 'POST',
    url: `/api/v1/lots/${lotId}/extraction`,
    headers: auth(jeton),
    payload: { horsLigne: false },
  });
}

describe('chaîne d’acquisition — garde-fous non négociables', () => {
  it('EF-M1-06/04 : le formulaire prérempli porte un score et une bande de confiance par cellule', async () => {
    const { app, seed } = banc;
    const creation = await app.inject({
      method: 'POST',
      url: '/api/v1/lots',
      headers: auth(seed.jetonEnseignant),
      payload: { enseignementId: seed.enseignementId, evaluationId: seed.evaluationIds[0] },
    });
    const lotId = creation.json().id as string;
    expect((await televerser(lotId, seed.jetonEnseignant)).statusCode).toBe(201);

    const extr = await extraire(lotId, seed.jetonEnseignant);
    expect(extr.statusCode).toBe(200);
    const form = extr.json().formulaire;

    for (const ligne of form.lignes) {
      expect(ligne.note.confiance.score).toBeGreaterThanOrEqual(0);
      expect(ligne.note.confiance.score).toBeLessThanOrEqual(1);
      expect(['haute', 'moyenne', 'basse']).toContain(ligne.note.confiance.bande);
    }
    expect(form.lignes.some((l: any) => l.note.confiance.bande !== 'haute')).toBe(true);
    // EF-M1-05 : au moins une ligne non rapprochée (fantôme injecté par le mock)
    expect(form.alertes.lignesNonRapprochees).toBeGreaterThanOrEqual(1);
  });

  it('EF-M1-10 : aucune écriture en Normalized avant validation explicite', async () => {
    const { app, database, seed } = banc;
    const creation = await app.inject({
      method: 'POST',
      url: '/api/v1/lots',
      headers: auth(seed.jetonEnseignant),
      payload: { enseignementId: seed.enseignementId, evaluationId: seed.evaluationIds[0] },
    });
    const lotId = creation.json().id as string;
    await televerser(lotId, seed.jetonEnseignant);
    const extr = await extraire(lotId, seed.jetonEnseignant);
    const form = extr.json().formulaire;

    // corrections humaines
    const patch = await app.inject({
      method: 'PATCH',
      url: `/api/v1/lots/${lotId}/formulaire`,
      headers: auth(seed.jetonEnseignant),
      payload: {
        editions: [{ champ: 'note', ligneIndex: form.lignes[0].ligneIndex, valeur: 15, statut: null }],
      },
    });
    expect(patch.statusCode).toBe(200);

    const notes = await database.db.select().from(t.note);
    expect(notes.length).toBe(0);

    const [lot] = await database.db.select().from(t.lotSaisie).where(eq(t.lotSaisie.id, lotId));
    expect(lot!.statut).toBe('en_revue');
  });

  it('EF-M1-11 : la validation sans accusé de récapitulatif est refusée', async () => {
    const { app, seed } = banc;
    const creation = await app.inject({
      method: 'POST',
      url: '/api/v1/lots',
      headers: auth(seed.jetonEnseignant),
      payload: { enseignementId: seed.enseignementId, evaluationId: seed.evaluationIds[0] },
    });
    const lotId = creation.json().id as string;
    await televerser(lotId, seed.jetonEnseignant);
    const { empreinte } = (await extraire(lotId, seed.jetonEnseignant)).json();

    const sansAccuse = await app.inject({
      method: 'POST',
      url: `/api/v1/lots/${lotId}/validation`,
      headers: auth(seed.jetonEnseignant),
      payload: { idempotencyKey: 'k'.repeat(12), roleValidation: 'enseignant', empreinteFormulaire: empreinte },
    });
    expect(sansAccuse.statusCode).toBe(400);
  });

  it('EF-M1-13 : la validation écrit en Normalized, lie le Raw et trace', async () => {
    const { app, database, seed } = banc;
    const creation = await app.inject({
      method: 'POST',
      url: '/api/v1/lots',
      headers: auth(seed.jetonEnseignant),
      payload: { enseignementId: seed.enseignementId, evaluationId: seed.evaluationIds[0] },
    });
    const lotId = creation.json().id as string;
    await televerser(lotId, seed.jetonEnseignant);
    const { empreinte } = (await extraire(lotId, seed.jetonEnseignant)).json();

    const val = await app.inject({
      method: 'POST',
      url: `/api/v1/lots/${lotId}/validation`,
      headers: auth(seed.jetonEnseignant),
      payload: { idempotencyKey: 'valide-key-1', roleValidation: 'enseignant', resumeAccepte: true, empreinteFormulaire: empreinte },
    });
    expect(val.statusCode).toBe(200);
    expect(val.json().notesEcrites).toBeGreaterThan(0);

    const notes = await database.db.select().from(t.note);
    expect(notes.length).toBe(val.json().notesEcrites);
    expect(notes.every((n) => n.origine === 'ocr' || n.origine === 'manuel')).toBe(true);

    const cellulesLiees = (await database.db.select().from(t.celluleReconnue)).filter((c) => c.noteId);
    expect(cellulesLiees.length).toBeGreaterThan(0);

    const validations = await database.db.select().from(t.validationTable).where(eq(t.validationTable.lotSaisieId, lotId));
    expect(validations.length).toBe(1);

    const [lot] = await database.db.select().from(t.lotSaisie).where(eq(t.lotSaisie.id, lotId));
    expect(lot!.statut).toBe('valide');
  });

  it('anti-écrasement : validation refusée si le formulaire a changé (empreinte périmée)', async () => {
    const { app, database, seed } = banc;
    const creation = await app.inject({
      method: 'POST',
      url: '/api/v1/lots',
      headers: auth(seed.jetonEnseignant),
      payload: { enseignementId: seed.enseignementId, evaluationId: seed.evaluationIds[0] },
    });
    const lotId = creation.json().id as string;
    await televerser(lotId, seed.jetonEnseignant);
    await extraire(lotId, seed.jetonEnseignant);

    const mauvais = await app.inject({
      method: 'POST',
      url: `/api/v1/lots/${lotId}/validation`,
      headers: auth(seed.jetonEnseignant),
      payload: { idempotencyKey: 'k2'.repeat(6), roleValidation: 'enseignant', resumeAccepte: true, empreinteFormulaire: 'sha256-bidon' },
    });
    expect(mauvais.statusCode).toBe(409);
    expect(mauvais.json().code).toBe('formulaire_perime');
    expect((await database.db.select().from(t.note)).length).toBe(0);
  });

  it('rejeu hors-ligne : même idempotencyKey ⇒ une seule écriture', async () => {
    const { app, database, seed } = banc;
    const creation = await app.inject({
      method: 'POST',
      url: '/api/v1/lots',
      headers: auth(seed.jetonEnseignant),
      payload: { enseignementId: seed.enseignementId, evaluationId: seed.evaluationIds[0] },
    });
    const lotId = creation.json().id as string;
    await televerser(lotId, seed.jetonEnseignant);
    const { empreinte } = (await extraire(lotId, seed.jetonEnseignant)).json();
    const payload = { idempotencyKey: 'rejeu-1234', roleValidation: 'enseignant', resumeAccepte: true, empreinteFormulaire: empreinte };

    const a = await app.inject({ method: 'POST', url: `/api/v1/lots/${lotId}/validation`, headers: auth(seed.jetonEnseignant), payload });
    const b = await app.inject({ method: 'POST', url: `/api/v1/lots/${lotId}/validation`, headers: auth(seed.jetonEnseignant), payload });
    expect(a.statusCode).toBe(200);
    expect(b.statusCode).toBe(200);
    expect(a.json().validationId).toBe(b.json().validationId);

    const validations = await database.db.select().from(t.validationTable).where(eq(t.validationTable.lotSaisieId, lotId));
    expect(validations.length).toBe(1);
  });

  it('EF-M1-16 : conflit de synchronisation sans écrasement silencieux', async () => {
    const { app, database, seed } = banc;
    const h = auth(seed.jetonEnseignant);

    // Lot A validé pour l'évaluation 0
    const a = await app.inject({ method: 'POST', url: '/api/v1/lots', headers: h, payload: { enseignementId: seed.enseignementId, evaluationId: seed.evaluationIds[0] } });
    const lotA = a.json().id as string;
    await televerser(lotA, seed.jetonEnseignant);
    const eA = (await extraire(lotA, seed.jetonEnseignant)).json();
    await app.inject({ method: 'POST', url: `/api/v1/lots/${lotA}/validation`, headers: h, payload: { idempotencyKey: 'lotA-key', roleValidation: 'enseignant', resumeAccepte: true, empreinteFormulaire: eA.empreinte } });
    const notesApresA = await database.db.select().from(t.note);
    expect(notesApresA.length).toBeGreaterThan(0);

    // Lot B, même évaluation ⇒ valeurs différentes (graine = lotId) ⇒ conflit
    const b = await app.inject({ method: 'POST', url: '/api/v1/lots', headers: h, payload: { enseignementId: seed.enseignementId, evaluationId: seed.evaluationIds[0] } });
    const lotB = b.json().id as string;
    await televerser(lotB, seed.jetonEnseignant);
    const eB = (await extraire(lotB, seed.jetonEnseignant)).json();
    const conflit = await app.inject({ method: 'POST', url: `/api/v1/lots/${lotB}/validation`, headers: h, payload: { idempotencyKey: 'lotB-key', roleValidation: 'enseignant', resumeAccepte: true, empreinteFormulaire: eB.empreinte } });

    expect(conflit.statusCode).toBe(409);
    expect(conflit.json().statut).toBe('en_conflit');
    expect(conflit.json().conflits.length).toBeGreaterThan(0);

    // Les notes existantes n'ont pas bougé
    const notesApresConflit = await database.db.select().from(t.note);
    expect(notesApresConflit.map((n) => n.valeur).sort()).toEqual(notesApresA.map((n) => n.valeur).sort());

    const [lotBRow] = await database.db.select().from(t.lotSaisie).where(eq(t.lotSaisie.id, lotB));
    expect(lotBRow!.statut).toBe('en_conflit');
  });

  it('isolation multi-tenant : un jeton ne voit pas les lots d’un autre établissement', async () => {
    const { app, database, seed } = banc;
    const autre = await seedDemo(database.db, undefined, { suffixe: 'B' });

    const creation = await app.inject({
      method: 'POST',
      url: '/api/v1/lots',
      headers: auth(seed.jetonEnseignant),
      payload: { enseignementId: seed.enseignementId, evaluationId: seed.evaluationIds[0] },
    });
    const lotId = creation.json().id as string;

    const vol = await app.inject({ method: 'GET', url: `/api/v1/lots/${lotId}`, headers: auth(autre.jetonEnseignant) });
    console.error('CREATION', creation.statusCode, creation.body);
    console.error('VOL', vol.statusCode, vol.body);
    expect(vol.statusCode).toBe(404);
  });

  it('EF-M1-19 : aucune action Module 2 dans le journal après validation', async () => {
    const { app, database, seed } = banc;
    const creation = await app.inject({
      method: 'POST',
      url: '/api/v1/lots',
      headers: auth(seed.jetonEnseignant),
      payload: { enseignementId: seed.enseignementId, evaluationId: seed.evaluationIds[0] },
    });
    const lotId = creation.json().id as string;
    await televerser(lotId, seed.jetonEnseignant);
    const { empreinte } = (await extraire(lotId, seed.jetonEnseignant)).json();
    await app.inject({ method: 'POST', url: `/api/v1/lots/${lotId}/validation`, headers: auth(seed.jetonEnseignant), payload: { idempotencyKey: 'm2-key-123', roleValidation: 'enseignant', resumeAccepte: true, empreinteFormulaire: empreinte } });

    const audits = await database.db.select().from(t.evenementAudit);
    const actionsAutorisees = new Set([
      'lot.creation',
      'lot.extraction',
      'lot.correction',
      'lot.valide',
      'lot.validation.conflit',
      'lot.conflit.resolu',
    ]);
    for (const a of audits) {
      expect(actionsAutorisees.has(a.action)).toBe(true);
      expect(a.action).not.toMatch(/module2|orientation|dashboard|intelligence/i);
    }
  });

  it('Raw immuable : une ré-extraction crée une nouvelle extraction, l’ancienne est conservée', async () => {
    const { app, database, seed } = banc;
    const creation = await app.inject({
      method: 'POST',
      url: '/api/v1/lots',
      headers: auth(seed.jetonEnseignant),
      payload: { enseignementId: seed.enseignementId, evaluationId: seed.evaluationIds[0] },
    });
    const lotId = creation.json().id as string;
    await televerser(lotId, seed.jetonEnseignant);

    const e1 = (await extraire(lotId, seed.jetonEnseignant)).json();
    const e2 = (await extraire(lotId, seed.jetonEnseignant)).json();
    expect(e1.extraction.id).not.toBe(e2.extraction.id);

    const extractions = await database.db.select().from(t.extractionOcr);
    expect(extractions.length).toBe(2);
    expect(extractions.some((x) => x.id === e1.extraction.id)).toBe(true);
  });

  it('EF-M1-09 : une valeur hors barème est signalée mais ne bloque pas la revue', async () => {
    const { app, seed } = banc;
    const creation = await app.inject({
      method: 'POST',
      url: '/api/v1/lots',
      headers: auth(seed.jetonEnseignant),
      payload: { enseignementId: seed.enseignementId, evaluationId: seed.evaluationIds[0] },
    });
    const lotId = creation.json().id as string;
    await televerser(lotId, seed.jetonEnseignant);
    const form = (await extraire(lotId, seed.jetonEnseignant)).json().formulaire;
    expect(form.alertes.horsBareme).toBeGreaterThanOrEqual(1);
    expect(form.lignes.some((l: any) => l.note.horsBareme)).toBe(true);
  });

  it('Lot L1 — Idempotence de création de lot via X-Idempotency-Key', async () => {
    const { app, database, seed } = banc;
    const headers = { ...auth(seed.jetonEnseignant), 'x-idempotency-key': 'idemp-creer-lot-1' };
    const payload = { enseignementId: seed.enseignementId, evaluationId: seed.evaluationIds[0] };

    const premier = await app.inject({ method: 'POST', url: '/api/v1/lots', headers, payload });
    expect(premier.statusCode).toBe(201);
    const premierJson = premier.json();

    const rejeu = await app.inject({ method: 'POST', url: '/api/v1/lots', headers, payload });
    expect(rejeu.statusCode).toBe(200);
    expect(rejeu.json().id).toBe(premierJson.id);

    // Une seule ligne créée en base
    const lots = await database.db.select().from(t.lotSaisie).where(eq(t.lotSaisie.id, premierJson.id));
    expect(lots.length).toBe(1);
  });

  it('Lot L1 — Quotas d’upload : max 10 documents par lot et code d’erreur clair', async () => {
    const { app, seed } = banc;
    const creation = await app.inject({
      method: 'POST',
      url: '/api/v1/lots',
      headers: auth(seed.jetonEnseignant),
      payload: { enseignementId: seed.enseignementId, evaluationId: seed.evaluationIds[0] },
    });
    const lotId = creation.json().id as string;

    // Téléverser 10 documents
    for (let i = 0; i < 10; i++) {
      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/lots/${lotId}/documents`,
        headers: { ...auth(seed.jetonEnseignant), 'content-type': 'image/jpeg' },
        payload: Buffer.from([1, 2, 3, i]),
      });
      expect(res.statusCode).toBe(201);
    }

    // Le 11ème document dépasse le quota
    const depassement = await app.inject({
      method: 'POST',
      url: `/api/v1/lots/${lotId}/documents`,
      headers: { ...auth(seed.jetonEnseignant), 'content-type': 'image/jpeg' },
      payload: Buffer.from([1, 2, 3, 99]),
    });
    expect(depassement.statusCode).toBe(413);
    expect(depassement.json().code).toBe('quota_depasse');
  });

  it('Lot L1 — Pagination et filtres sur GET /api/v1/lots', async () => {
    const { app, seed } = banc;
    // Créer 3 lots
    for (let i = 0; i < 3; i++) {
      await app.inject({
        method: 'POST',
        url: '/api/v1/lots',
        headers: auth(seed.jetonEnseignant),
        payload: { enseignementId: seed.enseignementId, evaluationId: seed.evaluationIds[0] },
      });
    }

    // Requête paginée (page 1, limit 2)
    const page1 = await app.inject({
      method: 'GET',
      url: '/api/v1/lots?page=1&limit=2',
      headers: auth(seed.jetonEnseignant),
    });
    expect(page1.statusCode).toBe(200);
    const body1 = page1.json();
    expect(body1.items.length).toBe(2);
    expect(body1.total).toBeGreaterThanOrEqual(3);
    expect(body1.page).toBe(1);
    expect(body1.limit).toBe(2);
    expect(page1.headers['x-total-count']).toBeDefined();
    expect(page1.headers['x-page']).toBe('1');
    expect(page1.headers['x-per-page']).toBe('2');

    // Requête paginée (page 2, limit 2)
    const page2 = await app.inject({
      method: 'GET',
      url: '/api/v1/lots?page=2&limit=2',
      headers: auth(seed.jetonEnseignant),
    });
    expect(page2.statusCode).toBe(200);
    expect(page2.json().items.length).toBeGreaterThanOrEqual(1);
  });

  it('Lot L1 — Erreurs bilingues FR/EN selon Accept-Language', async () => {
    const { app, seed } = banc;

    // En français
    const resFr = await app.inject({
      method: 'GET',
      url: '/api/v1/lots/00000000-0000-0000-0000-000000000000',
      headers: { ...auth(seed.jetonEnseignant), 'accept-language': 'fr-FR,fr;q=0.9' },
    });
    expect(resFr.statusCode).toBe(404);
    expect(resFr.json().code).toBe('lot_introuvable');
    expect(resFr.json().message).toBe('Lot introuvable.');

    // En anglais
    const resEn = await app.inject({
      method: 'GET',
      url: '/api/v1/lots/00000000-0000-0000-0000-000000000000',
      headers: { ...auth(seed.jetonEnseignant), 'accept-language': 'en-US,en;q=0.9' },
    });
    expect(resEn.statusCode).toBe(404);
    expect(resEn.json().code).toBe('lot_introuvable');
    expect(resEn.json().message).toBe('Batch not found.');
  });

  it('Lot L1 — Test de charge léger : 10 extractions successives sans fuite ni corruption', async () => {
    const { app, seed } = banc;
    const creation = await app.inject({
      method: 'POST',
      url: '/api/v1/lots',
      headers: auth(seed.jetonEnseignant),
      payload: { enseignementId: seed.enseignementId, evaluationId: seed.evaluationIds[0] },
    });
    const lotId = creation.json().id as string;
    await televerser(lotId, seed.jetonEnseignant);

    for (let i = 0; i < 10; i++) {
      const extr = await extraire(lotId, seed.jetonEnseignant);
      expect(extr.statusCode).toBe(200);
      expect(extr.json().extraction.scoreGlobal).toBeGreaterThanOrEqual(0.5);
    }
  });
});

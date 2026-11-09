import { randomUUID } from 'node:crypto';
import { and, desc, eq } from 'drizzle-orm';
import type { FastifyPluginAsync } from 'fastify';
import {
  creerLotSchema,
  demandeValidationSchema,
  formulairePreremptSchema,
  lancerExtractionSchema,
  patchFormulaireSchema,
  resolutionConflitSchema,
  type FormulairePrerempt,
} from '@buildnote/shared';
import * as t from '../db/schema.js';
import { ErreurMetier } from '../errors.js';
import { empreinteStable } from '../services/empreinte.js';
import { lancerExtraction } from '../services/extraction.js';
import { appliquerPatch } from '../services/patch.js';
import { resoudreConflit } from '../services/conflit.js';
import { validerLot } from '../services/validation.js';

export const routesLots: FastifyPluginAsync = async (app) => {
  const chargerLotDuTenant = async (lotId: string, etablissementId: string) => {
    const [lot] = await app.db
      .select()
      .from(t.lotSaisie)
      .where(and(eq(t.lotSaisie.id, lotId), eq(t.lotSaisie.etablissementId, etablissementId)));
    if (!lot) throw new ErreurMetier(404, 'lot_introuvable', 'Lot introuvable.');
    return lot;
  };

  /* Créer un lot ------------------------------------------------------ */
  app.post('/lots', async (req, reply) => {
    const body = creerLotSchema.parse(req.body);
    const { etablissementId, userId } = req.ctx;

    const [ens] = await app.db
      .select()
      .from(t.enseignement)
      .where(and(eq(t.enseignement.id, body.enseignementId), eq(t.enseignement.etablissementId, etablissementId)));
    if (!ens) throw new ErreurMetier(404, 'enseignement_introuvable', 'Enseignement introuvable.');

    const [evalRow] = await app.db
      .select()
      .from(t.evaluation)
      .where(
        and(
          eq(t.evaluation.id, body.evaluationId),
          eq(t.evaluation.enseignementId, body.enseignementId),
          eq(t.evaluation.etablissementId, etablissementId),
        ),
      );
    if (!evalRow) throw new ErreurMetier(404, 'evaluation_introuvable', 'Évaluation introuvable pour cet enseignement.');

    const id = randomUUID();
    await app.db.insert(t.lotSaisie).values({
      id,
      etablissementId,
      enseignementId: body.enseignementId,
      evaluationId: body.evaluationId,
      statut: 'ouvert',
      creePar: userId,
    });
    await app.db.insert(t.evenementAudit).values({
      id: randomUUID(),
      etablissementId,
      acteurId: userId,
      action: 'lot.creation',
      objetType: 'lot_saisie',
      objetId: id,
      resultat: 'ok',
    });

    return reply.status(201).send({ id, etablissementId, ...body, statut: 'ouvert', creeParUserId: userId });
  });

  /* Lister les lots -------------------------------------------------- */
  app.get('/lots', async (req) => {
    const rows = await app.db
      .select()
      .from(t.lotSaisie)
      .where(eq(t.lotSaisie.etablissementId, req.ctx.etablissementId))
      .orderBy(desc(t.lotSaisie.creeLe));

    return rows.map((lot) => {
      const form = lot.formulaireJson
        ? formulairePreremptSchema.safeParse(lot.formulaireJson)
        : null;
      const badges = form?.success ? compterBandes(form.data) : null;
      return {
        id: lot.id,
        statut: lot.statut,
        enseignementId: lot.enseignementId,
        evaluationId: lot.evaluationId,
        creeLe: lot.creeLe,
        nbLignes: form?.success ? form.data.resume.nbLignes : 0,
        badges,
        evaluationLibelle: form?.success ? form.data.evaluation.libelle : null,
        matiere: form?.success ? form.data.evaluation.matiere : null,
      };
    });
  });

  /* Détail d'un lot ------------------------------------------------- */
  app.get<{ Params: { id: string } }>('/lots/:id', async (req) => {
    const lot = await chargerLotDuTenant(req.params.id, req.ctx.etablissementId);
    const form = lot.formulaireJson ? formulairePreremptSchema.parse(lot.formulaireJson) : null;
    return {
      lot: {
        id: lot.id,
        etablissementId: lot.etablissementId,
        enseignementId: lot.enseignementId,
        evaluationId: lot.evaluationId,
        statut: lot.statut,
        creeParUserId: lot.creePar,
        creeLe: lot.creeLe,
      },
      formulaire: form,
      empreinte: form ? empreinteStable(form) : null,
    };
  });

  /* Téléverser un média (Raw) ------------------------------------- */
  /* Accepte soit un multipart/form-data (champ `fichier`), soit un corps binaire brut
     (utile pour la file de synchronisation hors-ligne du PWA). */
  app.addContentTypeParser(
    ['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'application/octet-stream'],
    { parseAs: 'buffer' },
    (_req, body, done) => done(null, body),
  );

  app.post<{ Params: { id: string } }>('/lots/:id/documents', async (req, reply) => {
    const lot = await chargerLotDuTenant(req.params.id, req.ctx.etablissementId);
    if (lot.statut === 'valide') throw new ErreurMetier(409, 'lot_deja_valide', 'Lot déjà validé.');

    let buf: Buffer;
    let mimetype: string;
    if (req.isMultipart()) {
      const fichier = await req.file();
      if (!fichier) throw new ErreurMetier(400, 'fichier_absent', 'Aucun fichier reçu.');
      buf = await fichier.toBuffer();
      mimetype = fichier.mimetype;
    } else if (Buffer.isBuffer(req.body)) {
      buf = req.body;
      mimetype = req.headers['content-type']?.split(';')[0]?.trim() ?? 'application/octet-stream';
    } else {
      throw new ErreurMetier(400, 'fichier_absent', 'Aucun fichier reçu.');
    }

    const typeMedia = mimetype.startsWith('image/')
      ? 'image'
      : mimetype === 'application/pdf'
        ? 'pdf'
        : mimetype.startsWith('video/')
          ? 'video'
          : null;
    if (!typeMedia) throw new ErreurMetier(415, 'type_non_supporte', `Type ${mimetype} non supporté.`);

    const docId = randomUUID();
    const cle = `${req.ctx.etablissementId}/${lot.id}/${docId}`;
    const blob = await app.blobStore.ecrire(cle, new Uint8Array(buf));

    const pageId = randomUUID();
    await app.db.transaction(async (tx) => {
      await tx.insert(t.documentSource).values({
        id: docId,
        etablissementId: req.ctx.etablissementId,
        lotSaisieId: lot.id,
        typeMedia,
        uriStockage: blob.uri,
        hash: blob.hash,
        taille: blob.taille,
        capturePar: req.ctx.userId,
      });
      await tx.insert(t.pageDocument).values({
        id: pageId,
        documentSourceId: docId,
        numero: 1,
        uriImage: blob.uri,
        largeur: null,
        hauteur: null,
      });
    });

    return reply.status(201).send({
      id: docId,
      lotId: lot.id,
      typeMedia,
      hash: blob.hash,
      taille: blob.taille,
      captureLe: new Date().toISOString(),
      pages: [{ id: pageId, numero: 1, uri: blob.uri, largeur: null, hauteur: null }],
    });
  });

  /* Lancer l'extraction (OCR simulé) ----------------------------- */
  app.post<{ Params: { id: string } }>('/lots/:id/extraction', async (req) => {
    const body = lancerExtractionSchema.parse(req.body ?? {});
    const lot = await chargerLotDuTenant(req.params.id, req.ctx.etablissementId);

    const { extraction } = await lancerExtraction({
      db: app.db,
      etablissementId: req.ctx.etablissementId,
      userId: req.ctx.userId,
      lotId: lot.id,
      image: { donnees: new Uint8Array(), typeMime: 'image/jpeg' },
      horsLigne: body.horsLigne,
    });

    const [maj] = await app.db.select().from(t.lotSaisie).where(eq(t.lotSaisie.id, lot.id));
    const form = formulairePreremptSchema.parse(maj!.formulaireJson);
    return { extraction, formulaire: form, empreinte: empreinteStable(form) };
  });

  /* Récupérer le formulaire prérempli -------------------------- */
  app.get<{ Params: { id: string } }>('/lots/:id/formulaire', async (req) => {
    const lot = await chargerLotDuTenant(req.params.id, req.ctx.etablissementId);
    if (!lot.formulaireJson) throw new ErreurMetier(409, 'extraction_absente', 'Lancez l’extraction.');
    const form = formulairePreremptSchema.parse(lot.formulaireJson);
    return { formulaire: form, empreinte: empreinteStable(form) };
  });

  /* Corrections humaines (brouillon — n'écrit pas en Normalized) */
  app.patch<{ Params: { id: string } }>('/lots/:id/formulaire', async (req) => {
    const patch = patchFormulaireSchema.parse(req.body);
    const lot = await chargerLotDuTenant(req.params.id, req.ctx.etablissementId);
    return appliquerPatch({
      db: app.db,
      etablissementId: req.ctx.etablissementId,
      userId: req.ctx.userId,
      lotId: lot.id,
      patch,
    });
  });

  /* Validation humaine explicite (LA PORTE) -------------------- */
  app.post<{ Params: { id: string } }>('/lots/:id/validation', async (req, reply) => {
    const demande = demandeValidationSchema.parse(req.body);
    const lot = await chargerLotDuTenant(req.params.id, req.ctx.etablissementId);
    if (demande.roleValidation === 'responsable' && req.ctx.role === 'enseignant') {
      throw new ErreurMetier(403, 'role_insuffisant', 'Contre-validation réservée aux responsables.');
    }

    const r = await validerLot({
      db: app.db,
      etablissementId: req.ctx.etablissementId,
      userId: req.ctx.userId,
      lotId: lot.id,
      demande,
    });
    if (r.type === 'conflit') return reply.status(409).send(r.rapport);
    return r.resultat;
  });

  /* Résolution de conflit de synchronisation ------------------ */
  app.post<{ Params: { id: string } }>('/lots/:id/conflit/resolution', async (req, reply) => {
    const body = resolutionConflitSchema.parse(req.body);
    const lot = await chargerLotDuTenant(req.params.id, req.ctx.etablissementId);
    const r = await resoudreConflit({
      db: app.db,
      etablissementId: req.ctx.etablissementId,
      userId: req.ctx.userId,
      lotId: lot.id,
      resolution: body,
    });
    if (r.type === 'conflit') return reply.status(409).send(r.rapport);
    return r.resultat;
  });
};

function compterBandes(form: FormulairePrerempt): { corriger: number; controler: number; verifier: number } {
  let corriger = 0;
  let controler = 0;
  let verifier = 0;
  for (const l of form.lignes) {
    if (l.note.source !== 'ocr') continue;
    if (l.note.horsBareme || l.note.confiance.bande === 'basse') corriger++;
    else if (l.note.confiance.bande === 'moyenne') controler++;
    else verifier++;
  }
  return { corriger, controler, verifier };
}

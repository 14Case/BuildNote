import { and, eq } from 'drizzle-orm';
import type { FastifyPluginAsync } from 'fastify';
import * as t from '../db/schema.js';
import { ErreurMetier } from '../errors.js';

/** Données de référence pour alimenter les sélecteurs du front (périmètre établissement). */
export const routesReference: FastifyPluginAsync = async (app) => {
  app.get('/me', async (req) => {
    const [etab] = await app.db
      .select()
      .from(t.etablissement)
      .where(eq(t.etablissement.id, req.ctx.etablissementId));
    return { utilisateur: req.ctx, etablissement: etab ?? null };
  });

  app.get('/enseignements', async (req) => {
    const rows = await app.db
      .select({
        id: t.enseignement.id,
        classeId: t.classe.id,
        classeLibelle: t.classe.libelle,
        matiereFr: t.matiere.libelleFr,
        matiereEn: t.matiere.libelleEn,
        enseignant: t.personne.nom,
      })
      .from(t.enseignement)
      .innerJoin(t.classe, eq(t.classe.id, t.enseignement.classeId))
      .innerJoin(t.matiere, eq(t.matiere.id, t.enseignement.matiereId))
      .innerJoin(t.personne, eq(t.personne.id, t.enseignement.enseignantId))
      .where(eq(t.enseignement.etablissementId, req.ctx.etablissementId));
    return rows;
  });

  app.get<{ Params: { id: string } }>('/enseignements/:id/evaluations', async (req) => {
    const rows = await app.db
      .select({
        id: t.evaluation.id,
        libelle: t.evaluation.libelle,
        type: t.evaluation.type,
        date: t.evaluation.date,
        baremeType: t.bareme.type,
        baremeMax: t.bareme.max,
      })
      .from(t.evaluation)
      .innerJoin(t.bareme, eq(t.bareme.id, t.evaluation.baremeId))
      .where(
        and(
          eq(t.evaluation.enseignementId, req.params.id),
          eq(t.evaluation.etablissementId, req.ctx.etablissementId),
        ),
      );
    return rows;
  });

  app.get<{ Params: { id: string } }>('/classes/:id/eleves', async (req) => {
    const [classe] = await app.db
      .select()
      .from(t.classe)
      .where(and(eq(t.classe.id, req.params.id), eq(t.classe.etablissementId, req.ctx.etablissementId)));
    if (!classe) throw new ErreurMetier(404, 'classe_introuvable', 'Classe introuvable.');

    const rows = await app.db
      .select({
        eleveId: t.eleve.id,
        nom: t.personne.nom,
        prenoms: t.personne.prenoms,
        matricule: t.eleve.matricule,
      })
      .from(t.inscription)
      .innerJoin(t.eleve, eq(t.eleve.id, t.inscription.eleveId))
      .innerJoin(t.personne, eq(t.personne.id, t.eleve.id))
      .where(
        and(
          eq(t.inscription.classeId, req.params.id),
          eq(t.inscription.etablissementId, req.ctx.etablissementId),
        ),
      );
    return rows;
  });
};

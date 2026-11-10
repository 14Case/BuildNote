import { randomUUID } from 'node:crypto';
import { and, desc, eq, isNull } from 'drizzle-orm';
import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import * as t from '../db/schema.js';
import { ErreurMetier } from '../errors.js';
import { DatabaseOrientationGateway } from '../orientation/gateway-db.js';
import { PonderationsFixture, ReferentialFixture } from '../orientation/fixtures.js';
import {
  genererDossierOrientation,
  ConsentementRequisError,
  type DependancesOrientation,
} from '../orientation/service.js';

const genererDossierSchema = z.object({
  eleveId: z.string().uuid(),
  anneeScolaireId: z.string().uuid(),
  langue: z.enum(['fr', 'en']).default('fr'),
  palier: z
    .enum(['primaire_vers_secondaire', 'premier_cycle_vers_second_cycle', 'terminale_vers_superieur'])
    .optional(),
  versionPonderations: z.string().optional(),
});

const majQuestionnaireSchema = z.object({
  anneeScolaireId: z.string().uuid(),
  consentementEleve: z.boolean().optional(),
  consentementParents: z.boolean().optional(),
  centresInteret: z.array(z.string()).optional(),
  matieresPreferees: z.array(z.string()).optional(),
  aspirationsMetiers: z.array(z.string()).optional(),
  avisParents: z
    .object({
      filieres_souhaitees: z.array(z.string()),
      priorite: z.number().int().min(1).max(5),
    })
    .nullable()
    .optional(),
  remarques: z.string().optional(),
});

export const routesOrientation: FastifyPluginAsync = async (app) => {
  const referentiel = new ReferentialFixture();
  const ponderations = new PonderationsFixture();
  const gateway = new DatabaseOrientationGateway(app.db);

  const deps: DependancesOrientation = {
    gateway,
    referentiel,
    ponderations,
    nouvelId: () => randomUUID(),
    positionEleve: async () => ({ lat: 4.05, lon: 9.7 }), // Douala / coordonnées Cameroun
  };

  /* Générer un dossier d'orientation (À LA DEMANDE — EF-M2-10/11/16/18) */
  app.post('/orientation/dossiers', async (req, reply) => {
    const body = genererDossierSchema.parse(req.body);
    const { etablissementId, userId } = req.ctx;

    // Vérifier l'existence de l'élève dans l'établissement
    const [eleveRow] = await app.db
      .select({ id: t.personne.id })
      .from(t.personne)
      .where(
        and(
          eq(t.personne.id, body.eleveId),
          eq(t.personne.etablissementId, etablissementId),
        ),
      );
    if (!eleveRow) {
      throw new ErreurMetier(404, 'eleve_introuvable', 'Élève introuvable dans cet établissement.');
    }

    try {
      const dossier = await genererDossierOrientation(
        {
          eleve_id: body.eleveId,
          etablissement_id: etablissementId,
          annee_scolaire_id: body.anneeScolaireId,
          declenchee_par: userId,
          langue: body.langue,
          ...(body.palier ? { palier: body.palier } : {}),
          ...(body.versionPonderations ? { version_ponderations: body.versionPonderations } : {}),
        },
        deps,
      );

      const dossierId = randomUUID();
      const recommandation = dossier.scenarios[0]?.scenario.filiere_libelle ?? null;
      const palierEffectif = dossier.demande.palier ?? body.palier ?? 'premier_cycle_vers_second_cycle';

      // Sauvegarde dans la strate Intelligence Data (reconstructible à volonté)
      await app.db.transaction(async (tx) => {
        await tx.insert(t.dossierOrientation).values({
          id: dossierId,
          etablissementId,
          eleveId: body.eleveId,
          anneeScolaireId: body.anneeScolaireId,
          declencheePar: userId,
          palier: palierEffectif,
          langue: body.langue,
          statut: 'genere',
          versionReferentielId: dossier.version_referentiel_id,
          versionPonderations: dossier.version_ponderations,
          scoreSynthese: dossier.synthese,
          filiereRecommandee: recommandation,
          dossierJson: dossier,
        });

        await tx.insert(t.evenementAudit).values({
          id: randomUUID(),
          etablissementId,
          acteurId: userId,
          action: 'orientation.dossier.genere',
          objetType: 'dossier_orientation',
          objetId: dossierId,
          resultat: 'ok',
          detailsJson: {
            eleveId: body.eleveId,
            palier: palierEffectif,
            scenarios: dossier.scenarios.length,
          },
        });
      });

      return reply.status(201).send({
        id: dossierId,
        ...dossier,
      });
    } catch (err) {
      if (err instanceof ConsentementRequisError) {
        throw new ErreurMetier(
          403,
          'consentement_requis',
          'Consentement Module 2 (élève et parents) requis avant toute génération.',
        );
      }
      throw err;
    }
  });

  /* Récupérer un dossier d'orientation par son ID */
  app.get<{ Params: { id: string } }>('/orientation/dossiers/:id', async (req) => {
    const [row] = await app.db
      .select()
      .from(t.dossierOrientation)
      .where(
        and(
          eq(t.dossierOrientation.id, req.params.id),
          eq(t.dossierOrientation.etablissementId, req.ctx.etablissementId),
        ),
      );

    if (!row) {
      throw new ErreurMetier(404, 'dossier_introuvable', "Dossier d'orientation introuvable.");
    }

    return {
      id: row.id,
      creeLe: row.creeLe,
      palier: row.palier,
      langue: row.langue,
      dossier: row.dossierJson,
    };
  });

  /* Lister les dossiers d'orientation d'un élève */
  app.get<{ Params: { eleveId: string } }>('/orientation/eleves/:eleveId/dossiers', async (req) => {
    const rows = await app.db
      .select({
        id: t.dossierOrientation.id,
        palier: t.dossierOrientation.palier,
        langue: t.dossierOrientation.langue,
        statut: t.dossierOrientation.statut,
        filiereRecommandee: t.dossierOrientation.filiereRecommandee,
        scoreSynthese: t.dossierOrientation.scoreSynthese,
        creeLe: t.dossierOrientation.creeLe,
      })
      .from(t.dossierOrientation)
      .where(
        and(
          eq(t.dossierOrientation.eleveId, req.params.eleveId),
          eq(t.dossierOrientation.etablissementId, req.ctx.etablissementId),
        ),
      )
      .orderBy(desc(t.dossierOrientation.creeLe));

    return rows;
  });

  /* Situation d'une classe pour le tableau de bord (À LA DEMANDE - EF-M2-02) */
  app.get<{ Params: { classeId: string }; Querystring: { anneeScolaireId?: string } }>(
    '/orientation/classes/:classeId/situation',
    async (req) => {
      const { classeId } = req.params;
      const { etablissementId } = req.ctx;

      const [classe] = await app.db
        .select()
        .from(t.classe)
        .where(
          and(
            eq(t.classe.id, classeId),
            eq(t.classe.etablissementId, etablissementId),
          ),
        );

      if (!classe) {
        throw new ErreurMetier(404, 'classe_introuvable', 'Classe introuvable.');
      }

      const anneeScolaireId = req.query.anneeScolaireId ?? classe.anneeScolaireId;

      // Inscriptions de la classe
      const inscriptions = await app.db
        .select({
          inscriptionId: t.inscription.id,
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
            eq(t.inscription.classeId, classeId),
            eq(t.inscription.anneeScolaireId, anneeScolaireId),
            eq(t.inscription.etablissementId, etablissementId),
          ),
        );

      // Consentements
      const consentements = await app.db
        .select()
        .from(t.consentementOrientation)
        .where(
          and(
            eq(t.consentementOrientation.etablissementId, etablissementId),
            eq(t.consentementOrientation.anneeScolaireId, anneeScolaireId),
          ),
        );
      const consentMap = new Map(consentements.map((c) => [c.eleveId, c]));

      // Questionnaires
      const questionnaires = await app.db
        .select()
        .from(t.questionnaireOrientation)
        .where(
          and(
            eq(t.questionnaireOrientation.etablissementId, etablissementId),
            eq(t.questionnaireOrientation.anneeScolaireId, anneeScolaireId),
          ),
        );
      const questMap = new Map(questionnaires.map((q) => [q.eleveId, q]));

      // Derniers dossiers
      const dossiers = await app.db
        .select()
        .from(t.dossierOrientation)
        .where(
          and(
            eq(t.dossierOrientation.etablissementId, etablissementId),
            eq(t.dossierOrientation.anneeScolaireId, anneeScolaireId),
          ),
        )
        .orderBy(desc(t.dossierOrientation.creeLe));

      const dossierParEleve = new Map<string, (typeof dossiers)[0]>();
      for (const d of dossiers) {
        if (!dossierParEleve.has(d.eleveId)) {
          dossierParEleve.set(d.eleveId, d);
        }
      }

      // Nombre de notes par inscription
      const notes = await app.db
        .select({
          inscriptionId: t.note.inscriptionId,
          valeur: t.note.valeur,
        })
        .from(t.note)
        .where(
          and(
            eq(t.note.etablissementId, etablissementId),
            isNull(t.note.statut),
          ),
        );
      const notesCount = new Map<string, number>();
      for (const n of notes) {
        if (n.valeur !== null) {
          notesCount.set(n.inscriptionId, (notesCount.get(n.inscriptionId) ?? 0) + 1);
        }
      }

      const eleves = inscriptions.map((ins) => {
        const c = consentMap.get(ins.eleveId);
        const q = questMap.get(ins.eleveId);
        const d = dossierParEleve.get(ins.eleveId);
        const nbNotes = notesCount.get(ins.inscriptionId) ?? 0;

        const consentementValide = Boolean(c?.consentementEleve && c?.consentementParents);
        const questComplet = Boolean(
          (q?.centresInteret as string[] | undefined)?.length ||
            (q?.matieresPreferees as string[] | undefined)?.length ||
            (q?.aspirationsMetiers as string[] | undefined)?.length ||
            q?.avisParents,
        );

        return {
          id: ins.eleveId,
          nom: ins.nom,
          prenoms: ins.prenoms,
          matricule: ins.matricule,
          classeId,
          classeLibelle: classe.libelle,
          anneeScolaireId,
          consentement: {
            eleve: c?.consentementEleve ?? false,
            parents: c?.consentementParents ?? false,
            valide: consentementValide,
            enregistreLe: (c?.dateConsentement ?? c?.creeLe)?.toISOString() ?? null,
          },
          questionnaire: {
            complet: questComplet,
            centresInteret: (q?.centresInteret as string[] | undefined) ?? [],
            matieresPreferees: (q?.matieresPreferees as string[] | undefined) ?? [],
            aspirationsMetiers: (q?.aspirationsMetiers as string[] | undefined) ?? [],
            avisParents: (q?.avisParents as any) ?? null,
            modifieLe: q?.modifieLe?.toISOString() ?? null,
          },
          dernierDossier: d
            ? {
                id: d.id,
                palier: d.palier,
                genereLe: d.creeLe.toISOString(),
                recommandation: d.filiereRecommandee,
                score: d.scoreSynthese ? Number(d.scoreSynthese) : null,
              }
            : null,
          nbNotes,
        };
      });

      return {
        classe: {
          id: classe.id,
          libelle: classe.libelle,
          anneeScolaireId,
        },
        stats: {
          totalEleves: eleves.length,
          avecConsentement: eleves.filter((e) => e.consentement.valide).length,
          avecQuestionnaire: eleves.filter((e) => e.questionnaire.complet).length,
          avecDossier: eleves.filter((e) => e.dernierDossier !== null).length,
        },
        eleves,
        derniereConsultation: new Date().toISOString(),
      };
    },
  );

  /* Récupérer questionnaire et consentement d'un élève */
  app.get<{ Params: { eleveId: string }; Querystring: { anneeScolaireId: string } }>(
    '/orientation/eleves/:eleveId/questionnaire',
    async (req) => {
      const { eleveId } = req.params;
      const { anneeScolaireId } = req.query;
      const { etablissementId } = req.ctx;

      const [consentement] = await app.db
        .select()
        .from(t.consentementOrientation)
        .where(
          and(
            eq(t.consentementOrientation.etablissementId, etablissementId),
            eq(t.consentementOrientation.eleveId, eleveId),
            eq(t.consentementOrientation.anneeScolaireId, anneeScolaireId),
          ),
        );

      const [questionnaire] = await app.db
        .select()
        .from(t.questionnaireOrientation)
        .where(
          and(
            eq(t.questionnaireOrientation.etablissementId, etablissementId),
            eq(t.questionnaireOrientation.eleveId, eleveId),
            eq(t.questionnaireOrientation.anneeScolaireId, anneeScolaireId),
          ),
        );

      return {
        eleveId,
        anneeScolaireId,
        consentement: {
          eleve: consentement?.consentementEleve ?? false,
          parents: consentement?.consentementParents ?? false,
          dateConsentement: consentement?.dateConsentement ?? null,
        },
        questionnaire: {
          centresInteret: (questionnaire?.centresInteret as string[] | undefined) ?? [],
          matieresPreferees: (questionnaire?.matieresPreferees as string[] | undefined) ?? [],
          aspirationsMetiers: (questionnaire?.aspirationsMetiers as string[] | undefined) ?? [],
          avisParents: questionnaire?.avisParents ?? null,
          remarques: questionnaire?.remarques ?? null,
        },
      };
    },
  );

  /* Mettre à jour questionnaire et/ou consentement d'un élève */
  app.put<{ Params: { eleveId: string } }>(
    '/orientation/eleves/:eleveId/questionnaire',
    async (req, reply) => {
      const { eleveId } = req.params;
      const body = majQuestionnaireSchema.parse(req.body);
      const { etablissementId, userId } = req.ctx;

      await app.db.transaction(async (tx) => {
        // 1. Consentement
        if (body.consentementEleve !== undefined || body.consentementParents !== undefined) {
          const [existantConsent] = await tx
            .select()
            .from(t.consentementOrientation)
            .where(
              and(
                eq(t.consentementOrientation.etablissementId, etablissementId),
                eq(t.consentementOrientation.eleveId, eleveId),
                eq(t.consentementOrientation.anneeScolaireId, body.anneeScolaireId),
              ),
            );

          const nouvEleve = body.consentementEleve ?? existantConsent?.consentementEleve ?? false;
          const nouvParents = body.consentementParents ?? existantConsent?.consentementParents ?? false;
          const dateConsentement = nouvEleve && nouvParents ? new Date() : null;

          if (existantConsent) {
            await tx
              .update(t.consentementOrientation)
              .set({
                consentementEleve: nouvEleve,
                consentementParents: nouvParents,
                dateConsentement,
                recueilliPar: userId,
                modifieLe: new Date(),
              })
              .where(eq(t.consentementOrientation.id, existantConsent.id));
          } else {
            await tx.insert(t.consentementOrientation).values({
              id: randomUUID(),
              etablissementId,
              eleveId,
              anneeScolaireId: body.anneeScolaireId,
              consentementEleve: nouvEleve,
              consentementParents: nouvParents,
              dateConsentement,
              recueilliPar: userId,
            });
          }
        }

        // 2. Questionnaire
        if (
          body.centresInteret !== undefined ||
          body.matieresPreferees !== undefined ||
          body.aspirationsMetiers !== undefined ||
          body.avisParents !== undefined ||
          body.remarques !== undefined
        ) {
          const [existantQuest] = await tx
            .select()
            .from(t.questionnaireOrientation)
            .where(
              and(
                eq(t.questionnaireOrientation.etablissementId, etablissementId),
                eq(t.questionnaireOrientation.eleveId, eleveId),
                eq(t.questionnaireOrientation.anneeScolaireId, body.anneeScolaireId),
              ),
            );

          if (existantQuest) {
            await tx
              .update(t.questionnaireOrientation)
              .set({
                centresInteret: body.centresInteret ?? existantQuest.centresInteret,
                matieresPreferees: body.matieresPreferees ?? existantQuest.matieresPreferees,
                aspirationsMetiers: body.aspirationsMetiers ?? existantQuest.aspirationsMetiers,
                avisParents: body.avisParents !== undefined ? body.avisParents : existantQuest.avisParents,
                remarques: body.remarques !== undefined ? body.remarques : existantQuest.remarques,
                modifieLe: new Date(),
              })
              .where(eq(t.questionnaireOrientation.id, existantQuest.id));
          } else {
            await tx.insert(t.questionnaireOrientation).values({
              id: randomUUID(),
              etablissementId,
              eleveId,
              anneeScolaireId: body.anneeScolaireId,
              centresInteret: body.centresInteret ?? [],
              matieresPreferees: body.matieresPreferees ?? [],
              aspirationsMetiers: body.aspirationsMetiers ?? [],
              avisParents: body.avisParents ?? null,
              remarques: body.remarques ?? null,
            });
          }
        }

        await tx.insert(t.evenementAudit).values({
          id: randomUUID(),
          etablissementId,
          acteurId: userId,
          action: 'orientation.questionnaire.maj',
          objetType: 'questionnaire_orientation',
          objetId: eleveId,
          resultat: 'ok',
        });
      });

      return reply.status(200).send({ ok: true, eleveId, anneeScolaireId: body.anneeScolaireId });
    },
  );
};

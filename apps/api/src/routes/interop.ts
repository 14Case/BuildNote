import { and, desc, eq } from 'drizzle-orm';
import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { configurationMappingSchema } from '@buildnote/shared';
import * as t from '../db/schema.js';
import { ErreurMetier } from '../errors.js';
import { parserContenuTabulaire } from '../interop/parser.js';
import { executerMappingTabulaire } from '../interop/mapping-engine.js';
import { executerImportCanonique } from '../interop/importer.js';
import { exporterPatrimoineEtablissement } from '../interop/exporter.js';

const apercuSchema = z.object({
  contenuFichier: z.string().min(1),
  delimiteur: z.string().optional(),
});

const executerImportSchema = z.object({
  contenuFichier: z.string().min(1),
  nomFichier: z.string().default('import.csv'),
  anneeScolaire: z.string().default('2024-2025'),
  classeLibelle: z.string().optional(),
  mapping: configurationMappingSchema.optional(),
});

export const routesInterop: FastifyPluginAsync = async (app) => {
  /* 1. Aperçu et détection de schéma pour assistance au mapping (H.3.4) */
  app.post('/interop/import/apercu', async (req) => {
    const body = apercuSchema.parse(req.body);
    const parse = parserContenuTabulaire(body.contenuFichier, body.delimiteur);

    return {
      delimiteur: parse.delimiteur,
      enTetes: parse.enTetes,
      totalLignes: parse.totalLignes,
      echantillon: parse.lignes.slice(0, 5),
    };
  });

  /* 2. Exécution d'un import de données (H.4 / H.5) */
  app.post('/interop/import/executer', async (req, reply) => {
    const body = executerImportSchema.parse(req.body);
    const { etablissementId, userId } = req.ctx;

    // Configuration de mapping (fournie ou déduite par défaut en mode tableau croisé)
    const config =
      body.mapping ??
      configurationMappingSchema.parse({
        version: '1.0',
        sourceType: 'csv',
        referenceSource: body.nomFichier,
        anneeScolaireDefaut: body.anneeScolaire,
        classeLibelleDefaut: body.classeLibelle ?? '3e 2',
        tableauCroise: {
          actif: true,
          colonnesEleve: ['Nom & Prénom', 'Nom & Prenom', 'Nom', 'Prénom', 'Sexe', 'Né(e) le', 'Matricule'],
          colonnesIgnorées: ['Moyenne', 'Rang', 'Moy', 'Rg', 'Total', 'Observation'],
          baremeParDefaut: 20,
          periodeParDefaut: 'T1',
          typeEvalParDefaut: 'devoir',
        },
      });

    const parse = parserContenuTabulaire(body.contenuFichier, config.separateur);
    const resultatMapping = executerMappingTabulaire(parse, config);

    const rapport = await executerImportCanonique(
      app.db,
      etablissementId,
      userId,
      resultatMapping,
    );

    return reply.status(200).send(rapport);
  });

  /* 3. Consultation du rapport d'un import spécifique */
  app.get<{ Params: { id: string } }>('/interop/rapports/:id', async (req) => {
    const { id } = req.params;
    const { etablissementId } = req.ctx;

    const [lot] = await app.db
      .select()
      .from(t.importLot)
      .where(
        and(
          eq(t.importLot.id, id),
          eq(t.importLot.etablissementId, etablissementId),
        ),
      );

    if (!lot) {
      throw new ErreurMetier(404, 'rapport_introuvable', 'Rapport d’import introuvable.');
    }

    const quarantaines = await app.db
      .select()
      .from(t.importQuarantaine)
      .where(
        and(
          eq(t.importQuarantaine.importLotId, id),
          eq(t.importQuarantaine.etablissementId, etablissementId),
        ),
      );

    return {
      lot,
      quarantaines,
    };
  });

  /* 4. Tableau de bord qualité des données (H.9) */
  app.get('/interop/qualite', async (req) => {
    const { etablissementId } = req.ctx;

    const imports = await app.db
      .select()
      .from(t.importLot)
      .where(eq(t.importLot.etablissementId, etablissementId))
      .orderBy(desc(t.importLot.creeLe));

    const totalLignes = imports.reduce((acc, i) => acc + i.lignesTotal, 0);
    const totalQuarantaine = imports.reduce((acc, i) => acc + i.lignesQuarantaine, 0);
    const totalConflits = imports.reduce((acc, i) => acc + i.lignesConflit, 0);

    const tauxQuarantaine = totalLignes > 0 ? (totalQuarantaine / totalLignes) * 100 : 0;
    const tauxConflits = totalLignes > 0 ? (totalConflits / totalLignes) * 100 : 0;

    return {
      nbImports: imports.length,
      totalLignesTraitees: totalLignes,
      totalQuarantaine,
      totalConflits,
      tauxQuarantainePct: Math.round(tauxQuarantaine * 10) / 10,
      tauxConflitsPct: Math.round(tauxConflits * 10) / 10,
      derniersImports: imports.slice(0, 5),
    };
  });

  /* 5. Export de réversibilité complet (H.7 / export-reversibilite.md) */
  app.get('/interop/export/reversibilite', async (req) => {
    const { etablissementId } = req.ctx;
    const exportCanonique = await exporterPatrimoineEtablissement(app.db, etablissementId);
    return exportCanonique;
  });
};

import { eq } from 'drizzle-orm';
import fp from 'fastify-plugin';
import type { Db } from '../db/client.js';
import * as t from '../db/schema.js';
import { ErreurMetier } from '../errors.js';

export interface ContexteRequete {
  readonly userId: string;
  readonly etablissementId: string;
  readonly role: 'enseignant' | 'responsable' | 'admin';
  readonly nom: string;
}

declare module 'fastify' {
  interface FastifyRequest {
    ctx: ContexteRequete;
  }
}

/**
 * Authentification de développement : jeton porteur → utilisateur.
 * Fixe le **périmètre établissement** de la requête (isolation multi-tenant).
 * En production : remplacé par un IdP/SSO (décision hors ADR-0002), même point d'ancrage `request.ctx`.
 */
export const authPlugin = fp<{ db: Db }>(async (app, opts) => {
  app.decorateRequest('ctx', null as unknown as ContexteRequete);

  app.addHook('onRequest', async (request) => {
    if (request.method === 'OPTIONS' || request.url === '/health') return;

    const entete = request.headers.authorization;
    const jeton = entete?.startsWith('Bearer ') ? entete.slice(7).trim() : null;
    if (!jeton) throw new ErreurMetier(401, 'non_authentifie', 'Jeton porteur requis.');

    const [u] = await opts.db.select().from(t.utilisateur).where(eq(t.utilisateur.jetonDev, jeton));
    if (!u || !u.actif) throw new ErreurMetier(401, 'jeton_invalide', 'Jeton inconnu ou inactif.');

    request.ctx = {
      userId: u.id,
      etablissementId: u.etablissementId,
      role: u.role as ContexteRequete['role'],
      nom: u.nom,
    };
  });
});

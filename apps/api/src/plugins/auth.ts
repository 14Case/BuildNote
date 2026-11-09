import type { FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';
import type { Db } from '../db/client.js';
import { ErreurMetier } from '../errors.js';
import {
  CompositeIdentityProvider,
  DevIdentityProvider,
  SessionIdentityProvider,
  type IdentityProvider,
} from '../auth/identity-provider.js';

export interface ContexteRequete {
  readonly userId: string;
  readonly etablissementId: string;
  readonly role: 'enseignant' | 'responsable' | 'admin' | 'admin_etablissement' | 'admin_technique';
  readonly nom: string;
}

declare module 'fastify' {
  interface FastifyRequest {
    ctx: ContexteRequete;
  }
}

export interface AuthPluginOptions {
  db: Db;
  provider?: IdentityProvider;
  nodeEnv?: string;
}

/**
 * Plugin d'authentification BuildNote (ADR-0005, ADR-0006).
 * Valide l'identité via l'interface `IdentityProvider` et fixe le contexte établissement (`request.ctx`).
 */
export const authPlugin = fp<AuthPluginOptions>(async (app, opts) => {
  app.decorateRequest('ctx', null as unknown as ContexteRequete);

  const provider =
    opts.provider ??
    new CompositeIdentityProvider([
      new SessionIdentityProvider(opts.db),
      new DevIdentityProvider(opts.db, opts.nodeEnv),
    ]);

  app.addHook('onRequest', async (request) => {
    if (
      request.method === 'OPTIONS' ||
      request.url === '/health' ||
      request.url === '/ready' ||
      request.url === '/api/v1/auth/login'
    ) {
      return;
    }

    const ctx = await provider.verifierRequete(request);
    if (!ctx) {
      throw new ErreurMetier(401, 'non_authentifie', 'Authentification requise.');
    }

    request.ctx = ctx;
  });
});

/**
 * Garde d'autorisation RBAC au niveau route (ADR-0006 §2).
 */
export function exigerRole(...roles: ContexteRequete['role'][]) {
  return async (request: FastifyRequest) => {
    if (!request.ctx || !roles.includes(request.ctx.role)) {
      throw new ErreurMetier(403, 'acces_refuse', `Rôle insuffisant. Requis : ${roles.join(', ')}.`);
    }
  };
}

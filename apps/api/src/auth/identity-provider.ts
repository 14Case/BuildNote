import { createHash } from 'node:crypto';
import type { FastifyRequest } from 'fastify';
import { and, eq, gt } from 'drizzle-orm';
import type { Db } from '../db/client.js';
import * as t from '../db/schema.js';
import { ErreurMetier } from '../errors.js';
import type { ContexteRequete } from '../plugins/auth.js';

/**
 * Interface d'accès à l'identité de l'utilisateur (ADR-0006 §3).
 * Isole le mécanisme d'authentification (jeton dev, session cookie, OIDC).
 */
export interface IdentityProvider {
  verifierRequete(request: FastifyRequest): Promise<ContexteRequete | null>;
}

/**
 * Calcule l'empreinte SHA-256 d'un jeton opaque de session (stockage sécurisé en base).
 */
export function hacherJetonSession(jeton: string): string {
  return createHash('sha256').update(jeton).digest('hex');
}

/**
 * Calcule le jeton anti-CSRF associé à une session (double-submit / en-tête X-CSRF-Token).
 */
export function genererCsrfToken(jetonSession: string): string {
  return createHash('sha256').update(`${jetonSession}:csrf`).digest('hex');
}

/**
 * Authentification de développement basée sur un jeton porteur statique.
 * GARDE-FOU ADR-0006 §3 : strictement interdit lorsque NODE_ENV === 'production'.
 */
export class DevIdentityProvider implements IdentityProvider {
  constructor(
    private readonly db: Db,
    private readonly nodeEnv: string = process.env.NODE_ENV || 'development'
  ) {
    if (this.nodeEnv === 'production') {
      throw new Error('Garde-fou ADR-0006 : DevIdentityProvider est strictement interdit en production.');
    }
  }

  async verifierRequete(request: FastifyRequest): Promise<ContexteRequete | null> {
    const entete = request.headers.authorization;
    const jeton = entete?.startsWith('Bearer ') ? entete.slice(7).trim() : null;
    if (!jeton) return null;

    const [u] = await this.db.select().from(t.utilisateur).where(eq(t.utilisateur.jetonDev, jeton));
    if (!u || !u.actif) throw new ErreurMetier(401, 'jeton_invalide', 'Jeton inconnu ou inactif.');

    return {
      userId: u.id,
      etablissementId: u.etablissementId,
      role: u.role as ContexteRequete['role'],
      nom: u.nom,
    };
  }
}

/**
 * Authentification de production par session serveur (ADR-0006 §1).
 * Cookie HttpOnly `buildnote_session` ou en-tête `X-Session-Token` / `Authorization: Session <token>`.
 */
export class SessionIdentityProvider implements IdentityProvider {
  constructor(private readonly db: Db) {}

  async verifierRequete(request: FastifyRequest): Promise<ContexteRequete | null> {
    const cookieHeader = request.headers.cookie;
    let jetonSession: string | null = null;
    let estCookie = false;

    if (cookieHeader) {
      const match = cookieHeader.match(/(?:^|;\s*)buildnote_session=([^;]+)/);
      if (match && match[1]) {
        jetonSession = decodeURIComponent(match[1]);
        estCookie = true;
      }
    }

    if (!jetonSession) {
      const authHeader = request.headers.authorization;
      if (authHeader?.startsWith('Session ')) {
        jetonSession = authHeader.slice(8).trim();
      } else if (typeof request.headers['x-session-token'] === 'string') {
        jetonSession = request.headers['x-session-token'];
      }
    }

    if (!jetonSession) return null;

    const jetonHache = hacherJetonSession(jetonSession);
    const maintenant = new Date();

    const [session] = await this.db
      .select()
      .from(t.session)
      .where(and(eq(t.session.jetonHache, jetonHache), gt(t.session.expireLe, maintenant)));

    if (!session) {
      throw new ErreurMetier(401, 'session_expiree', 'Session invalide ou expirée.');
    }

    const [u] = await this.db.select().from(t.utilisateur).where(eq(t.utilisateur.id, session.utilisateurId));
    if (!u || !u.actif) {
      throw new ErreurMetier(401, 'utilisateur_inactif', 'Compte utilisateur inactif ou introuvable.');
    }

    // Protection anti-CSRF (ADR-0006 §1) sur mutations authentifiées par cookie
    if (estCookie && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) {
      if (!request.url.includes('/auth/login')) {
        const csrfTokenHeader = request.headers['x-csrf-token'];
        const csrfAttendu = genererCsrfToken(jetonSession);
        if (csrfTokenHeader !== csrfAttendu && csrfTokenHeader !== jetonSession) {
          throw new ErreurMetier(403, 'csrf_invalide', 'Jeton CSRF manquant ou invalide.');
        }
      }
    }

    return {
      userId: u.id,
      etablissementId: session.etablissementId,
      role: u.role as ContexteRequete['role'],
      nom: u.nom,
    };
  }
}

/**
 * Composite qui tente les fournisseurs d'identité dans l'ordre (Session puis Dev).
 */
export class CompositeIdentityProvider implements IdentityProvider {
  constructor(private readonly providers: IdentityProvider[]) {}

  async verifierRequete(request: FastifyRequest): Promise<ContexteRequete | null> {
    for (const provider of this.providers) {
      const resultat = await provider.verifierRequete(request);
      if (resultat) return resultat;
    }
    return null;
  }
}

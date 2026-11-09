import { randomBytes, randomUUID } from 'node:crypto';
import type { FastifyPluginAsync } from 'fastify';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { genererCsrfToken, hacherJetonSession } from '../auth/identity-provider.js';
import { ScryptPasswordHasher, type PasswordHasher } from '../auth/password.js';
import * as t from '../db/schema.js';
import { ErreurMetier } from '../errors.js';

const loginSchema = z.object({
  email: z.string().email(),
  motDePasse: z.string().min(1),
  etablissementId: z.string().uuid().optional(),
});

export interface RoutesAuthOptions {
  hasher?: PasswordHasher;
}

export const routesAuth: FastifyPluginAsync<RoutesAuthOptions> = async (app, opts) => {
  const hasher = opts.hasher ?? new ScryptPasswordHasher();

  app.post('/auth/login', async (request, reply) => {
    const { email, motDePasse, etablissementId } = loginSchema.parse(request.body);

    const conditions = [eq(t.utilisateur.email, email)];
    if (etablissementId) {
      conditions.push(eq(t.utilisateur.etablissementId, etablissementId));
    }

    const [u] = await app.db.select().from(t.utilisateur).where(and(...conditions));

    if (!u || !u.actif) {
      await app.db.insert(t.evenementAudit).values({
        id: randomUUID(),
        etablissementId: etablissementId ?? '00000000-0000-0000-0000-000000000000',
        action: 'auth.login',
        objetType: 'utilisateur',
        objetId: email,
        resultat: 'echec',
        detailsJson: { raison: 'utilisateur_inconnu_ou_inactif' },
      });
      throw new ErreurMetier(401, 'identifiants_invalides', 'Identifiants invalides.');
    }

    if (!u.motDePasseHache) {
      throw new ErreurMetier(401, 'mot_de_passe_non_defini', 'Aucun mot de passe configuré sur ce compte.');
    }

    const valide = await hasher.verifier(motDePasse, u.motDePasseHache);
    if (!valide) {
      await app.db.insert(t.evenementAudit).values({
        id: randomUUID(),
        etablissementId: u.etablissementId,
        acteurId: u.id,
        action: 'auth.login',
        objetType: 'utilisateur',
        objetId: u.id,
        resultat: 'echec',
        detailsJson: { raison: 'mot_de_passe_incorrect' },
      });
      throw new ErreurMetier(401, 'identifiants_invalides', 'Identifiants invalides.');
    }

    const jetonBrut = randomBytes(32).toString('hex');
    const jetonHache = hacherJetonSession(jetonBrut);
    const expireLe = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 jours
    const sessionId = randomUUID();

    await app.db.insert(t.session).values({
      id: sessionId,
      etablissementId: u.etablissementId,
      utilisateurId: u.id,
      jetonHache,
      expireLe,
      ip: request.ip,
      userAgent: typeof request.headers['user-agent'] === 'string' ? request.headers['user-agent'] : null,
    });

    await app.db.insert(t.evenementAudit).values({
      id: randomUUID(),
      etablissementId: u.etablissementId,
      acteurId: u.id,
      action: 'auth.login',
      objetType: 'session',
      objetId: sessionId,
      resultat: 'succes',
    });

    const csrfToken = genererCsrfToken(jetonBrut);
    const secureFlag = process.env.NODE_ENV === 'production' ? '; Secure' : '';

    reply.header(
      'Set-Cookie',
      `buildnote_session=${encodeURIComponent(jetonBrut)}; Path=/; HttpOnly; SameSite=Lax${secureFlag}; Max-Age=604800`
    );

    return {
      session: {
        id: sessionId,
        expireLe: expireLe.toISOString(),
      },
      utilisateur: {
        id: u.id,
        nom: u.nom,
        email: u.email,
        role: u.role,
        etablissementId: u.etablissementId,
      },
      csrfToken,
    };
  });

  app.post('/auth/logout', async (request, reply) => {
    const cookieHeader = request.headers.cookie;
    if (cookieHeader) {
      const match = cookieHeader.match(/(?:^|;\s*)buildnote_session=([^;]+)/);
      if (match && match[1]) {
        const jeton = decodeURIComponent(match[1]);
        const jetonHache = hacherJetonSession(jeton);
        await app.db.delete(t.session).where(eq(t.session.jetonHache, jetonHache));
      }
    }

    if (request.ctx) {
      await app.db.insert(t.evenementAudit).values({
        id: randomUUID(),
        etablissementId: request.ctx.etablissementId,
        acteurId: request.ctx.userId,
        action: 'auth.logout',
        objetType: 'session',
        resultat: 'succes',
      });
    }

    reply.header('Set-Cookie', 'buildnote_session=; Path=/; HttpOnly; Max-Age=0');
    return { ok: true };
  });

  app.get('/auth/moi', async (request) => {
    return {
      utilisateur: request.ctx,
    };
  });
};

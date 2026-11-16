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
  traqueur?: TraqueurBruteForce;
}

interface TentativeEchec {
  compteur: number;
  premierEchec: number;
  bloqueJusquA: number | null;
}

export class TraqueurBruteForce {
  private tentatives = new Map<string, TentativeEchec>();

  constructor(
    readonly tentativesMax = 5,
    readonly fenetreMs = 5 * 60 * 1000,
    readonly dureeBlocageMs = 5 * 60 * 1000,
  ) {}

  estBloque(cle: string): boolean {
    const maintenant = Date.now();
    const entry = this.tentatives.get(cle);
    if (!entry) return false;

    if (entry.bloqueJusquA) {
      if (maintenant < entry.bloqueJusquA) {
        return true;
      }
      this.tentatives.delete(cle);
      return false;
    }

    if (maintenant - entry.premierEchec > this.fenetreMs) {
      this.tentatives.delete(cle);
      return false;
    }

    return false;
  }

  enregistrerEchec(cle: string): boolean {
    const maintenant = Date.now();
    let entry = this.tentatives.get(cle);

    if (!entry || maintenant - entry.premierEchec > this.fenetreMs) {
      entry = { compteur: 1, premierEchec: maintenant, bloqueJusquA: null };
      this.tentatives.set(cle, entry);
      return false;
    }

    entry.compteur++;
    if (entry.compteur >= this.tentativesMax) {
      entry.bloqueJusquA = maintenant + this.dureeBlocageMs;
      return true;
    }
    return false;
  }

  reinitialiser(cle: string): void {
    this.tentatives.delete(cle);
  }
}

export const routesAuth: FastifyPluginAsync<RoutesAuthOptions> = async (app, opts) => {
  const hasher = opts.hasher ?? new ScryptPasswordHasher();
  const traqueur = opts.traqueur ?? new TraqueurBruteForce();

  app.post('/auth/login', async (request, reply) => {
    const { email, motDePasse, etablissementId } = loginSchema.parse(request.body);
    const ip = request.ip || '127.0.0.1';
    const cleBruteForce = `${ip}:${email.toLowerCase()}`;

    const conditions = [eq(t.utilisateur.email, email)];
    if (etablissementId) {
      conditions.push(eq(t.utilisateur.etablissementId, etablissementId));
    }

    const [u] = await app.db.select().from(t.utilisateur).where(and(...conditions));
    const etabId = u?.etablissementId ?? etablissementId;

    if (traqueur.estBloque(cleBruteForce)) {
      if (etabId) {
        await app.db.insert(t.evenementAudit).values({
          id: randomUUID(),
          etablissementId: etabId,
          action: 'auth.bruteforce_bloque',
          objetType: 'utilisateur',
          objetId: email,
          resultat: 'bloque',
          detailsJson: { raison: 'trop_de_tentatives', ip },
        });
      }
      throw new ErreurMetier(429, 'trop_de_tentatives', 'Trop de tentatives infructueuses. Compte temporairement verrouillé.');
    }

    if (!u || !u.actif) {
      traqueur.enregistrerEchec(cleBruteForce);
      if (etabId) {
        await app.db.insert(t.evenementAudit).values({
          id: randomUUID(),
          etablissementId: etabId,
          action: 'auth.login',
          objetType: 'utilisateur',
          objetId: email,
          resultat: 'echec',
          detailsJson: { raison: 'utilisateur_inconnu_ou_inactif' },
        });
      }
      throw new ErreurMetier(401, 'identifiants_invalides', 'Identifiants invalides.');
    }

    if (!u.motDePasseHache) {
      throw new ErreurMetier(401, 'mot_de_passe_non_defini', 'Aucun mot de passe configuré sur ce compte.');
    }

    const valide = await hasher.verifier(motDePasse, u.motDePasseHache);
    if (!valide) {
      const devientBloque = traqueur.enregistrerEchec(cleBruteForce);
      await app.db.insert(t.evenementAudit).values({
        id: randomUUID(),
        etablissementId: u.etablissementId,
        acteurId: u.id,
        action: devientBloque ? 'auth.bruteforce_bloque' : 'auth.login',
        objetType: 'utilisateur',
        objetId: u.id,
        resultat: 'echec',
        detailsJson: { raison: devientBloque ? 'seuil_tentatives_atteint' : 'mot_de_passe_incorrect' },
      });
      throw new ErreurMetier(401, 'identifiants_invalides', 'Identifiants invalides.');
    }

    traqueur.reinitialiser(cleBruteForce);

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

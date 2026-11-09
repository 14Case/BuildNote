import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { DevIdentityProvider } from '../src/auth/identity-provider.js';
import { ScryptPasswordHasher } from '../src/auth/password.js';
import * as t from '../src/db/schema.js';
import { creerBancEssai, type BancEssai } from './helpers.js';

let banc: BancEssai;

beforeEach(async () => {
  banc = await creerBancEssai();
});

afterEach(async () => {
  if (banc) await banc.fermer();
});

describe('socle de sécurité v1 (ADR-0006) — Authentification, Session et RBAC', () => {
  it('ScryptPasswordHasher : hache et vérifie de manière cryptographiquement sûre', async () => {
    const hasher = new ScryptPasswordHasher();
    const motDePasse = 'SecretFort2026!';
    const hache = await hasher.hash(motDePasse);

    expect(hache).toMatch(/^\$scrypt\$N=\d+,r=\d+,p=\d+\$[a-f0-9]+\$[a-f0-9]+$/);
    expect(await hasher.verifier(motDePasse, hache)).toBe(true);
    expect(await hasher.verifier('MauvaisMotDePasse', hache)).toBe(false);
    expect(await hasher.verifier(motDePasse, 'malformed_hash')).toBe(false);
  });

  it('Garde-fou ADR-0006 §3 : DevIdentityProvider est strictement interdit en production', () => {
    expect(() => new DevIdentityProvider(banc.database.db, 'production')).toThrow(
      /strictement interdit en production/i
    );
  });

  it('POST /api/v1/auth/login : connexion réussie avec mot de passe haché et cookie de session HttpOnly', async () => {
    const { app, database, seed } = banc;

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: {
        email: seed.emailEnseignant,
        motDePasse: seed.motDePasseDemo,
      },
    });

    expect(res.statusCode).toBe(200);
    const corps = res.json();
    expect(corps.utilisateur.email).toBe(seed.emailEnseignant);
    expect(corps.utilisateur.role).toBe('enseignant');
    expect(corps.session.id).toBeDefined();
    expect(corps.csrfToken).toBeDefined();

    // Vérifie le cookie HttpOnly
    const setCookie = res.headers['set-cookie'] as string;
    expect(setCookie).toBeDefined();
    expect(setCookie).toContain('buildnote_session=');
    expect(setCookie).toContain('HttpOnly');
    expect(setCookie).toContain('SameSite=Lax');

    // Vérifie la journalisation d'audit
    const audits = await database.db
      .select()
      .from(t.evenementAudit)
      .where(eq(t.evenementAudit.action, 'auth.login'));
    expect(audits.some((a) => a.resultat === 'succes')).toBe(true);
  });

  it('POST /api/v1/auth/login : mot de passe erroné rejeté en 401 et consigné dans le journal d\'audit', async () => {
    const { app, database, seed } = banc;

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: {
        email: seed.emailEnseignant,
        motDePasse: 'FauxMotDePasse123!',
      },
    });

    expect(res.statusCode).toBe(401);
    expect(res.json().code).toBe('identifiants_invalides');

    const audits = await database.db
      .select()
      .from(t.evenementAudit)
      .where(eq(t.evenementAudit.action, 'auth.login'));
    expect(audits.some((a) => a.resultat === 'echec')).toBe(true);
  });

  it('Session & CSRF : requête authentifiée par cookie et protection anti-CSRF sur mutation', async () => {
    const { app, seed } = banc;

    // 1. Connexion
    const login = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: seed.emailEnseignant, motDePasse: seed.motDePasseDemo },
    });
    const setCookie = login.headers['set-cookie'] as string;
    const cookie = setCookie.split(';')[0];
    const { csrfToken } = login.json();

    // 2. GET /auth/moi avec cookie de session
    const moi = await app.inject({
      method: 'GET',
      url: '/api/v1/auth/moi',
      headers: { cookie },
    });
    expect(moi.statusCode).toBe(200);
    expect(moi.json().utilisateur.nom).toBe('Amélie N.');

    // 3. Mutation POST sans jeton CSRF => rejet 403
    const mutationSansCsrf = await app.inject({
      method: 'POST',
      url: '/api/v1/lots',
      headers: { cookie },
      payload: { enseignementId: seed.enseignementId, evaluationId: seed.evaluationIds[0] },
    });
    expect(mutationSansCsrf.statusCode).toBe(403);
    expect(mutationSansCsrf.json().code).toBe('csrf_invalide');

    // 4. Mutation POST avec jeton CSRF valide => acceptée (201)
    const mutationAvecCsrf = await app.inject({
      method: 'POST',
      url: '/api/v1/lots',
      headers: { cookie, 'x-csrf-token': csrfToken },
      payload: { enseignementId: seed.enseignementId, evaluationId: seed.evaluationIds[0] },
    });
    expect(mutationAvecCsrf.statusCode).toBe(201);
  });

  it('POST /api/v1/auth/logout : supprime la session et révoque le cookie', async () => {
    const { app, database, seed } = banc;

    const login = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: seed.emailEnseignant, motDePasse: seed.motDePasseDemo },
    });
    const setCookie = login.headers['set-cookie'] as string;
    const cookie = setCookie.split(';')[0];
    const { csrfToken } = login.json();

    // Déconnexion
    const logout = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/logout',
      headers: { cookie, 'x-csrf-token': csrfToken },
    });
    expect(logout.statusCode).toBe(200);
    expect(logout.headers['set-cookie']).toContain('Max-Age=0');

    // Session révoquée en base
    const sessions = await database.db.select().from(t.session);
    expect(sessions.length).toBe(0);

    // Nouvelle requête avec le cookie => 401
    const apresLogout = await app.inject({
      method: 'GET',
      url: '/api/v1/auth/moi',
      headers: { cookie },
    });
    expect(apresLogout.statusCode).toBe(401);
  });

  it('Observabilité et en-têtes de sécurité : /ready, /health et en-têtes HTTP', async () => {
    const { app } = banc;

    const ready = await app.inject({ method: 'GET', url: '/ready' });
    expect(ready.statusCode).toBe(200);
    expect(ready.json()).toEqual({ ok: true, database: 'connected' });
    expect(ready.headers['x-content-type-options']).toBe('nosniff');
    expect(ready.headers['x-frame-options']).toBe('DENY');
    expect(ready.headers['content-security-policy']).toBe("default-src 'self'");

    const health = await app.inject({ method: 'GET', url: '/health' });
    expect(health.statusCode).toBe(200);
    expect(health.json()).toEqual({ ok: true, service: 'buildnote-api' });
  });
});

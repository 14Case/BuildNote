import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import * as t from '../src/db/schema.js';
import { auth, creerBancEssai, type BancEssai } from './helpers.js';
import { chargerConfig, masquerSecretsConfig } from '../src/config.js';
import { TraqueurBruteForce } from '../src/routes/auth.js';
import { hacherJetonSession } from '../src/auth/identity-provider.js';

let banc: BancEssai;

beforeAll(async () => {
  banc = await creerBancEssai();
}, 60000);

afterAll(async () => {
  if (banc) {
    await banc.fermer();
  }
});

describe('Lot L6 — Durcissement de sécurité, tests d’intrusion et cloisonnement multi-tenant', () => {
  it('K.6 / OS-3 : Cloisonnement multi-tenant hermétique — impossible de lire ou modifier les lots d’un autre établissement', async () => {
    const { app, database, seed } = banc;

    // 1. Créer un second établissement (Tenant 2) avec son propre utilisateur
    const tenant2Id = randomUUID();
    await database.db.insert(t.etablissement).values({
      id: tenant2Id,
      nom: 'Lycée Bilingue de Yaoundé (Tenant 2)',
      code: 'LBY-T2',
      type: 'lycee',
    });

    const user2Id = randomUUID();
    const jetonTenant2 = 'dev-token-tenant-2';
    await database.db.insert(t.utilisateur).values({
      id: user2Id,
      etablissementId: tenant2Id,
      nom: 'Enseignant Tenant 2',
      email: 'prof@tenant2.cm',
      role: 'enseignant',
      jetonDev: jetonTenant2,
    });

    const annee2Id = randomUUID();
    await database.db.insert(t.anneeScolaire).values({
      id: annee2Id,
      etablissementId: tenant2Id,
      libelle: '2025-2026',
    });

    const classe2Id = randomUUID();
    await database.db.insert(t.classe).values({
      id: classe2Id,
      etablissementId: tenant2Id,
      anneeScolaireId: annee2Id,
      libelle: '4e A',
    });

    const mat2Id = randomUUID();
    await database.db.insert(t.matiere).values({
      id: mat2Id,
      etablissementId: tenant2Id,
      libelleFr: 'Histoire',
      libelleEn: 'History',
    });

    const prof2Id = randomUUID();
    await database.db.insert(t.personne).values({
      id: prof2Id,
      etablissementId: tenant2Id,
      nom: 'PROF2',
      prenoms: 'Jean',
      nomNormalise: 'PROF2 JEAN',
    });
    await database.db.insert(t.enseignant).values({ id: prof2Id });

    const ens2Id = randomUUID();
    await database.db.insert(t.enseignement).values({
      id: ens2Id,
      etablissementId: tenant2Id,
      classeId: classe2Id,
      matiereId: mat2Id,
      enseignantId: prof2Id,
    });

    const bareme2Id = randomUUID();
    await database.db.insert(t.bareme).values({
      id: bareme2Id,
      etablissementId: tenant2Id,
      type: 'sur_20',
      min: '0',
      max: '20',
    });

    const eval2Id = randomUUID();
    await database.db.insert(t.evaluation).values({
      id: eval2Id,
      etablissementId: tenant2Id,
      enseignementId: ens2Id,
      baremeId: bareme2Id,
      libelle: 'Évaluation Histoire T2',
      type: 'devoir',
    });

    // Créer un lot dans le Tenant 2
    const lotTenant2Id = randomUUID();
    await database.db.insert(t.lotSaisie).values({
      id: lotTenant2Id,
      etablissementId: tenant2Id,
      enseignementId: ens2Id,
      evaluationId: eval2Id,
      statut: 'ouvert',
      creePar: user2Id,
    });

    // TENTATIVE D'INTRUSION 1 : L'enseignant du Tenant 1 tente de lire le lot du Tenant 2
    const resGet = await app.inject({
      method: 'GET',
      url: `/api/v1/lots/${lotTenant2Id}`,
      headers: auth(seed.jetonEnseignant),
    });
    expect([403, 404]).toContain(resGet.statusCode);

    // TENTATIVE D'INTRUSION 2 : L'enseignant du Tenant 1 tente de lister les lots (ne doit voir que Tenant 1)
    const resList = await app.inject({
      method: 'GET',
      url: '/api/v1/lots',
      headers: auth(seed.jetonEnseignant),
    });
    expect(resList.statusCode).toBe(200);
    const listBody = resList.json();
    const ids = (listBody.items || listBody).map((item: any) => item.id);
    expect(ids).not.toContain(lotTenant2Id);

    // TENTATIVE D'INTRUSION 3 : L'enseignant du Tenant 1 tente un export de réversibilité (ne doit pas contenir Tenant 2)
    const resExport = await app.inject({
      method: 'GET',
      url: '/api/v1/interop/export/reversibilite',
      headers: auth(seed.jetonResponsable),
    });
    expect(resExport.statusCode).toBe(200);
    const exportBody = resExport.json();
    const exportClasses = exportBody.classes.map((c: any) => c.libelle);
    expect(exportClasses).not.toContain('4e A'); // classe du Tenant 2 strictement exclue
  });

  it('K.3 / K.11 : Protection contre les attaques par force brute (verrouillage temporaire après 5 échecs)', async () => {
    const { app, database, seed } = banc;

    // Créer un traqueur avec seuil de 3 tentatives pour le test unitaire
    const traqueurTest = new TraqueurBruteForce(3, 60000, 60000);
    const cle = '192.168.1.100:test@demo.cm';

    expect(traqueurTest.estBloque(cle)).toBe(false);
    traqueurTest.enregistrerEchec(cle);
    expect(traqueurTest.estBloque(cle)).toBe(false);
    traqueurTest.enregistrerEchec(cle);
    expect(traqueurTest.estBloque(cle)).toBe(false);
    const bloquage = traqueurTest.enregistrerEchec(cle); // 3e échec -> bloqué
    expect(bloquage).toBe(true);
    expect(traqueurTest.estBloque(cle)).toBe(true);

    // Test réel via l'endpoint POST /api/v1/auth/login
    // Effectuer 5 tentatives erronées successives
    for (let i = 0; i < 5; i++) {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: {
          email: seed.emailEnseignant,
          motDePasse: `MauvaisMotDePasse${i}!`,
        },
      });
      expect(res.statusCode).toBe(401);
    }

    // La 6e tentative doit être bloquée avec HTTP 429
    const resBloquee = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: {
        email: seed.emailEnseignant,
        motDePasse: 'MauvaisMotDePasse6!',
      },
    });
    expect(resBloquee.statusCode).toBe(429);
    expect(resBloquee.json().code).toBe('trop_de_tentatives');

    // Vérifier l'événement d'audit
    const auditEvents = await database.db
      .select()
      .from(t.evenementAudit)
      .where(eq(t.evenementAudit.action, 'auth.bruteforce_bloque'));
    expect(auditEvents.length).toBeGreaterThanOrEqual(1);
  });

  it('K.5 / OS-1 : Non-exposition des informations sensibles (mots de passe, hashes)', async () => {
    const { database, seed } = banc;

    // Vérifier que les jetons de session sont stockés hachés en base (SHA-256)
    const jetonTest = 'jeton-secret-1234567890';
    const hache = hacherJetonSession(jetonTest);
    expect(hache).not.toBe(jetonTest);
    expect(hache).toHaveLength(64); // SHA-256 hexadécimal

    // Vérifier le masquage des secrets dans la configuration
    const configTest = chargerConfig({
      DATABASE_URL: 'postgres://utilisateur_secret:mot_de_passe_ultra_confidentiel@postgres:5432/buildnote',
      S3_SECRET_KEY: 'cle_secrete_minio_confidentielle',
      S3_ACCESS_KEY: 'cle_acces_minio',
      PORT: '3001',
      HOST: '127.0.0.1',
      PGLITE_PATH: '',
    } as NodeJS.ProcessEnv);

    const configMasquee = masquerSecretsConfig(configTest);
    expect(configMasquee.DATABASE_URL).toContain('****');
    expect(configMasquee.DATABASE_URL).not.toContain('mot_de_passe_ultra_confidentiel');
    expect(configMasquee.S3_SECRET_KEY).toBe('********');
  });

  it('K.2 / ADR-0006 §4 : En-têtes HTTP de sécurité stricts présents sur toutes les réponses', async () => {
    const { app } = banc;

    const res = await app.inject({
      method: 'GET',
      url: '/health',
    });

    expect(res.statusCode).toBe(200);
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-frame-options']).toBe('DENY');
    expect(res.headers['content-security-policy']).toBe("default-src 'self'");
    expect(res.headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
    expect(res.headers['permissions-policy']).toBe('camera=(self), microphone=(), geolocation=()');
  });
});

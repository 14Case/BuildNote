import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';

function scryptAsync(
  motDePasse: string,
  salt: string,
  keylen: number,
  options: { cost: number; blockSize: number; parallelization: number }
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(motDePasse, salt, keylen, options, (err, derivedKey) => {
      if (err) reject(err);
      else resolve(derivedKey as Buffer);
    });
  });
}

/**
 * Interface de hachage de mot de passe (ADR-0004 §4, ADR-0006 §1).
 * Isole l'algorithme de hachage (Argon2id / Scrypt) derrière un contrat stable.
 */
export interface PasswordHasher {
  hash(motDePasse: string): Promise<string>;
  verifier(motDePasse: string, hache: string): Promise<boolean>;
}

/**
 * Implémentation Scrypt mémoire-dure (OWASP recommended parameters).
 * Format encodé : `$scrypt$N=16384,r=8,p=1$<saltHex>$<derivedHex>`
 */
export class ScryptPasswordHasher implements PasswordHasher {
  private readonly keylen = 64;
  private readonly cost = process.env.NODE_ENV === 'test' ? 1024 : 16384;
  private readonly blockSize = 8;
  private readonly parallel = 1;

  async hash(motDePasse: string): Promise<string> {
    if (!motDePasse || motDePasse.length < 8) {
      throw new Error('Le mot de passe doit contenir au moins 8 caractères.');
    }
    const salt = randomBytes(16).toString('hex');
    const derived = await scryptAsync(motDePasse, salt, this.keylen, {
      cost: this.cost,
      blockSize: this.blockSize,
      parallelization: this.parallel,
    });
    return `$scrypt$N=${this.cost},r=${this.blockSize},p=${this.parallel}$${salt}$${derived.toString('hex')}`;
  }

  async verifier(motDePasse: string, hache: string): Promise<boolean> {
    if (!motDePasse || !hache) return false;

    const parties = hache.split('$');
    if (parties.length !== 5 || parties[1] !== 'scrypt') {
      return false;
    }
    const [, , paramsStr, salt, hashHex] = parties;
    if (!paramsStr || !salt || !hashHex) return false;

    const match = /N=(\d+),r=(\d+),p=(\d+)/.exec(paramsStr);
    const N = match && match[1] ? parseInt(match[1], 10) : this.cost;
    const r = match && match[2] ? parseInt(match[2], 10) : this.blockSize;
    const p = match && match[3] ? parseInt(match[3], 10) : this.parallel;

    try {
      const actualBuffer = Buffer.from(hashHex, 'hex');
      const derived = await scryptAsync(motDePasse, salt, actualBuffer.length, {
        cost: N,
        blockSize: r,
        parallelization: p,
      });

      if (actualBuffer.length !== derived.length) return false;
      return timingSafeEqual(actualBuffer, derived);
    } catch {
      return false;
    }
  }
}

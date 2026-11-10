import { describe, expect, it } from 'vitest';
import { HttpOcrProvider } from '../src/ocr/http-provider.js';
import { MockOcrProvider } from '../src/ocr/mock-provider.js';
import { creerOcrProvider } from '../src/ocr/factory.js';

describe('OCR Providers (Lot L1)', () => {
  it('instancie MockOcrProvider par défaut', () => {
    const provider = creerOcrProvider({});
    expect(provider).toBeInstanceOf(MockOcrProvider);
    expect(provider.nom).toBe('mock');
    expect(provider.capacites().horsLigne).toBe(true);
  });

  it('instancie HttpOcrProvider si explicitement demandé avec une URL', () => {
    const provider = creerOcrProvider({
      mode: 'http',
      httpConfig: { endpointUrl: 'http://127.0.0.1:8000' },
    });
    expect(provider).toBeInstanceOf(HttpOcrProvider);
    expect(provider.nom).toBe('http-ocr');
    expect(provider.capacites().horsLigne).toBe(false);
  });

  it('HttpOcrProvider gère le repli et les timeouts sur service injoignable', async () => {
    const provider = new HttpOcrProvider({
      endpointUrl: 'http://127.0.0.1:1', // Port fermé/injoignable
      timeoutMs: 500,
    });
    await expect(
      provider.detecterStructure({ donnees: new Uint8Array([1, 2]), typeMime: 'image/jpeg' }),
    ).rejects.toThrow();

    const recon = await provider.reconnaitre(
      { donnees: new Uint8Array([1, 2]), typeMime: 'image/jpeg' },
      'nombre',
    );
    expect(recon.texte).toBe('');
    expect(recon.score).toBe(0);
  });
});

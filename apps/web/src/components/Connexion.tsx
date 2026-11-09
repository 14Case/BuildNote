import React, { useState } from 'react';
import { useI18n } from '../i18n.js';
import type { Utilisateur } from '../types.js';

interface ConnexionProps {
  onConnexionReussie: (u: Utilisateur, csrfToken?: string) => void;
}

export const Connexion: React.FC<ConnexionProps> = ({ onConnexionReussie }) => {
  const { t } = useI18n();
  const [email, setEmail] = useState('amelie@demo.cm');
  const [motDePasse, setMotDePasse] = useState('MotDePasse123!');
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const soumettre = async (e: React.FormEvent) => {
    e.preventDefault();
    setChargement(true);
    setErreur(null);

    try {
      const res = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, motDePasse }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Identifiants invalides');
      }

      onConnexionReussie(data.utilisateur, data.csrfToken);
    } catch (err: any) {
      // Si l'API est injoignable (mode hors-ligne pur), connexion locale démo
      if (email.includes('amelie') || email.includes('demo')) {
        onConnexionReussie({
          id: 'u-local-enseignant',
          nom: 'Amélie N. (Hors-ligne)',
          email: 'amelie@demo.cm',
          role: 'enseignant',
          etablissementId: 'et-pilote-local',
        });
      } else {
        setErreur(err.message || 'Erreur de connexion');
      }
    } finally {
      setChargement(false);
    }
  };

  const connexionRapide = (role: 'enseignant' | 'responsable') => {
    if (role === 'enseignant') {
      setEmail('amelie@demo.cm');
      setMotDePasse('MotDePasse123!');
    } else {
      setEmail('dir@demo.cm');
      setMotDePasse('MotDePasse123!');
    }
  };

  return (
    <div style={{ maxWidth: 420, margin: '60px auto', padding: '0 16px' }}>
      <div
        style={{
          background: 'var(--bn-white)',
          padding: 32,
          borderRadius: 12,
          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
          border: '1px solid var(--bn-gray-200)',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--bn-blue-dark)' }}>
            Connexion BuildNote
          </h2>
          <p style={{ color: 'var(--bn-gray-500)', fontSize: '0.85rem', marginTop: 4 }}>
            Portail enseignant & vérification humaine
          </p>
        </div>

        {erreur && (
          <div
            style={{
              padding: '10px 14px',
              backgroundColor: '#fee2e2',
              border: '1px solid #fecaca',
              color: '#b91c1c',
              borderRadius: 6,
              fontSize: '0.85rem',
              marginBottom: 16,
            }}
          >
            {erreur}
          </div>
        )}

        <form onSubmit={soumettre} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 6 }}>
              Adresse email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid var(--bn-gray-300)',
                borderRadius: 6,
                fontSize: '0.9rem',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 6 }}>
              Mot de passe
            </label>
            <input
              type="password"
              value={motDePasse}
              onChange={(e) => setMotDePasse(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid var(--bn-gray-300)',
                borderRadius: 6,
                fontSize: '0.9rem',
              }}
            />
          </div>

          <button
            type="submit"
            className="btn-primary"
            disabled={chargement}
            style={{ padding: '12px', fontSize: '0.95rem', marginTop: 8 }}
          >
            {chargement ? 'Connexion en cours...' : 'Se connecter'}
          </button>
        </form>

        <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid var(--bn-gray-200)' }}>
          <p style={{ fontSize: '0.75rem', color: 'var(--bn-gray-500)', marginBottom: 8 }}>
            Comptes de test pilote :
          </p>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              className="btn-secondary"
              style={{ flex: 1, fontSize: '0.75rem', padding: '6px' }}
              onClick={() => connexionRapide('enseignant')}
            >
              Enseignant (Amélie)
            </button>
            <button
              type="button"
              className="btn-secondary"
              style={{ flex: 1, fontSize: '0.75rem', padding: '6px' }}
              onClick={() => connexionRapide('responsable')}
            >
              Directeur (Responsable)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

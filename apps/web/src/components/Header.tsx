import React from 'react';
import { useI18n } from '../i18n.js';
import type { Utilisateur } from '../types.js';

interface HeaderProps {
  utilisateur: Utilisateur | null;
  enLigne: boolean;
  nbFileSynchro: number;
  onOuvrirSynchro: () => void;
  onDeconnexion: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  utilisateur,
  enLigne,
  nbFileSynchro,
  onOuvrirSynchro,
  onDeconnexion,
}) => {
  const { langue, setLangue, t } = useI18n();

  return (
    <header className="app-header">
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              width: 32,
              height: 32,
              backgroundColor: 'var(--bn-blue)',
              borderRadius: 6,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontWeight: 'bold',
            }}
          >
            BN
          </div>
          <div>
            <h1 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--bn-blue-dark)' }}>
              {t('app.name')}
            </h1>
            <p style={{ fontSize: '0.75rem', color: 'var(--bn-gray-500)' }}>
              {t('app.module1')}
            </p>
          </div>
        </div>

        {/* Badge réseau En ligne / Hors-ligne */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '3px 8px',
            borderRadius: '999px',
            fontSize: '0.75rem',
            fontWeight: 500,
            backgroundColor: enLigne ? '#ecfdf5' : '#fff7ed',
            color: enLigne ? '#065f46' : '#9a3412',
            border: `1px solid ${enLigne ? '#a7f3d0' : '#fed7aa'}`,
          }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              backgroundColor: enLigne ? 'var(--bn-success)' : 'var(--bn-orange)',
            }}
          />
          {enLigne ? 'Connecté' : 'Hors-ligne'}
        </div>

        {/* Bouton de synchronisation en attente */}
        {nbFileSynchro > 0 && (
          <button
            onClick={onOuvrirSynchro}
            className="btn-accent"
            style={{ padding: '3px 10px', fontSize: '0.75rem' }}
          >
            {t('nav.sync')} ({nbFileSynchro})
          </button>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {/* Sélecteur de langue bilingue FR/EN */}
        <div style={{ display: 'flex', border: '1px solid var(--bn-gray-300)', borderRadius: 6, overflow: 'hidden' }}>
          <button
            type="button"
            onClick={() => setLangue('fr')}
            style={{
              padding: '4px 8px',
              fontSize: '0.8rem',
              backgroundColor: langue === 'fr' ? 'var(--bn-blue)' : 'white',
              color: langue === 'fr' ? 'white' : 'var(--bn-gray-700)',
              border: 'none',
              borderRadius: 0,
            }}
          >
            FR
          </button>
          <button
            type="button"
            onClick={() => setLangue('en')}
            style={{
              padding: '4px 8px',
              fontSize: '0.8rem',
              backgroundColor: langue === 'en' ? 'var(--bn-blue)' : 'white',
              color: langue === 'en' ? 'white' : 'var(--bn-gray-700)',
              border: 'none',
              borderRadius: 0,
            }}
          >
            EN
          </button>
        </div>

        {/* Utilisateur connecté & déconnexion */}
        {utilisateur && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>
              {utilisateur.nom} ({utilisateur.role})
            </span>
            <button
              type="button"
              onClick={onDeconnexion}
              className="btn-secondary"
              style={{ padding: '4px 10px', fontSize: '0.8rem' }}
            >
              Déconnexion
            </button>
          </div>
        )}
      </div>
    </header>
  );
};

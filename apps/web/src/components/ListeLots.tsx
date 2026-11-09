import React, { useState } from 'react';
import type { LotResume } from '../types.js';

interface Props {
  lots: LotResume[];
  onOuvrirLot: (lotId: string) => void;
  onNouvelleCapture: () => void;
}

export const ListeLots: React.FC<Props> = ({ lots, onOuvrirLot, onNouvelleCapture }) => {
  const [onglet, setOnglet] = useState<'a_verifier' | 'valides'>('a_verifier');

  const lotsFiltres = lots.filter((l) =>
    onglet === 'a_verifier' ? l.statut === 'ouvert' || l.statut === 'en_revue' : l.statut === 'valide'
  );

  return (
    <div style={{ maxWidth: 1100, margin: '24px auto', padding: '0 20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--bn-blue-dark)' }}>
            Fiches de notes capturées
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--bn-gray-500)', marginTop: 2 }}>
            Module 1 — File d'attente de vérification humaine & archivage
          </p>
        </div>

        <button type="button" onClick={onNouvelleCapture} className="btn-accent" style={{ fontWeight: 600 }}>
          📷 Nouvelle capture
        </button>
      </div>

      {/* Onglets */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--bn-gray-300)', marginBottom: 20 }}>
        <button
          type="button"
          onClick={() => setOnglet('a_verifier')}
          style={{
            padding: '10px 18px',
            border: 'none',
            background: 'none',
            borderBottom: onglet === 'a_verifier' ? '2px solid var(--bn-blue)' : '2px solid transparent',
            color: onglet === 'a_verifier' ? 'var(--bn-blue)' : 'var(--bn-gray-500)',
            fontWeight: onglet === 'a_verifier' ? 700 : 500,
            cursor: 'pointer',
          }}
        >
          À vérifier ({lots.filter((l) => l.statut === 'ouvert' || l.statut === 'en_revue').length})
        </button>
        <button
          type="button"
          onClick={() => setOnglet('valides')}
          style={{
            padding: '10px 18px',
            border: 'none',
            background: 'none',
            borderBottom: onglet === 'valides' ? '2px solid var(--bn-blue)' : '2px solid transparent',
            color: onglet === 'valides' ? 'var(--bn-blue)' : 'var(--bn-gray-500)',
            fontWeight: onglet === 'valides' ? 700 : 500,
            cursor: 'pointer',
          }}
        >
          Validés ({lots.filter((l) => l.statut === 'valide').length})
        </button>
      </div>

      {/* Liste des cartes */}
      {lotsFiltres.length === 0 ? (
        <div
          style={{
            backgroundColor: 'var(--bn-white)',
            borderRadius: 8,
            padding: 40,
            textAlign: 'center',
            border: '1px solid var(--bn-gray-200)',
            color: 'var(--bn-gray-500)',
          }}
        >
          Aucun lot dans cette vue. Cliquez sur « Nouvelle capture » pour numériser une fiche.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
          {lotsFiltres.map((lot) => (
            <div
              key={lot.id}
              style={{
                backgroundColor: 'var(--bn-white)',
                borderRadius: 8,
                padding: 18,
                border: '1px solid var(--bn-gray-200)',
                boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <span
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      padding: '2px 8px',
                      borderRadius: 4,
                      backgroundColor: lot.statut === 'valide' ? '#ecfdf5' : '#eff6ff',
                      color: lot.statut === 'valide' ? '#065f46' : 'var(--bn-blue-dark)',
                    }}
                  >
                    {lot.statut === 'valide' ? 'Scellé / Validé' : 'En attente de vérification'}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--bn-gray-500)' }}>
                    {new Date(lot.creeLe).toLocaleDateString()}
                  </span>
                </div>

                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--bn-gray-900)' }}>
                  {lot.classeLibelle} · {lot.matiereLibelle}
                </h3>
                <div style={{ fontSize: '0.85rem', color: 'var(--bn-gray-700)', marginTop: 2, marginBottom: 12 }}>
                  {lot.evaluationLibelle}
                </div>

                {/* Badges d'alerte OCR */}
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
                  {lot.nbACorriger > 0 && (
                    <span className="badge-confidence-basse" style={{ fontSize: '0.75rem', padding: '2px 6px', borderRadius: 4 }}>
                      ⚠️ {lot.nbACorriger} à corriger
                    </span>
                  )}
                  {lot.nbAControler > 0 && (
                    <span className="badge-confidence-moyenne" style={{ fontSize: '0.75rem', padding: '2px 6px', borderRadius: 4 }}>
                      {lot.nbAControler} à contrôler
                    </span>
                  )}
                  <span className="badge-confidence-haute" style={{ fontSize: '0.75rem', padding: '2px 6px', borderRadius: 4 }}>
                    {lot.nbVerifie} fiables
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onOuvrirLot(lot.id)}
                className={lot.statut === 'valide' ? 'btn-secondary' : 'btn-primary'}
                style={{ width: '100%', fontSize: '0.85rem', padding: '8px' }}
              >
                {lot.statut === 'valide' ? 'Consulter le lot scellé' : 'Vérifier et corriger →'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

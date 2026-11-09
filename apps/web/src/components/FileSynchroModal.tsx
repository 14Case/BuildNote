import React from 'react';
import type { ElementFileSynchro } from '../types.js';

interface Props {
  file: ElementFileSynchro[];
  enLigne: boolean;
  onFermer: () => void;
  onSynchroniser: () => void;
  onSupprimerItem: (id: string) => void;
}

export const FileSynchroModal: React.FC<Props> = ({
  file,
  enLigne,
  onFermer,
  onSynchroniser,
  onSupprimerItem,
}) => {
  return (
    <div className="modal-overlay">
      <div className="modal-card" style={{ maxWidth: 640 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--bn-blue-dark)' }}>
            File de synchronisation hors-ligne (IndexedDB)
          </h3>
          <button type="button" onClick={onFermer} className="btn-secondary" style={{ padding: '2px 8px' }}>
            ✕
          </button>
        </div>

        <p style={{ fontSize: '0.85rem', color: 'var(--bn-gray-500)', marginBottom: 16 }}>
          Les opérations effectuées hors-ligne sont enregistrées localement dans votre navigateur et
          seront transmises au serveur de l'établissement dès le rétablissement de la connexion.
        </p>

        {file.length === 0 ? (
          <div style={{ padding: 32, textAlign: 'center', color: 'var(--bn-gray-500)' }}>
            Aucune action en attente. Toutes vos modifications sont synchronisées.
          </div>
        ) : (
          <div style={{ maxHeight: 300, overflowY: 'auto', marginBottom: 20 }}>
            {file.map((item) => (
              <div
                key={item.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px',
                  borderBottom: '1px solid var(--bn-gray-200)',
                  backgroundColor: item.statut === 'conflit' ? 'var(--bn-orange-light)' : 'transparent',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                    {item.action === 'validation' ? 'Validation de lot' : 'Mise à jour formulaire'} — Lot {item.lotId.slice(0, 8)}...
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--bn-gray-500)' }}>
                    Créé le {new Date(item.creeLe).toLocaleTimeString()} · Idempotency Key : {item.idempotencyKey.slice(0, 10)}...
                  </div>
                  {item.erreur && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--bn-danger)', marginTop: 4 }}>
                      {item.erreur}
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span
                    style={{
                      padding: '2px 8px',
                      borderRadius: 4,
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      backgroundColor: item.statut === 'conflit' ? '#fee2e2' : '#f1f5f9',
                      color: item.statut === 'conflit' ? '#b91c1c' : '#334155',
                    }}
                  >
                    {item.statut}
                  </span>
                  <button
                    type="button"
                    onClick={() => onSupprimerItem(item.id)}
                    style={{ background: 'none', border: 'none', color: 'var(--bn-gray-500)', fontSize: '0.9rem' }}
                    title="Supprimer"
                  >
                    🗑
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
          <button type="button" className="btn-secondary" onClick={onFermer}>
            Fermer
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={onSynchroniser}
            disabled={!enLigne || file.length === 0}
          >
            {enLigne ? 'Synchroniser maintenant' : 'Hors-ligne (en attente)'}
          </button>
        </div>
      </div>
    </div>
  );
};

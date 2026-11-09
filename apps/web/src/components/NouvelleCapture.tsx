import React, { useState } from 'react';

interface Props {
  onFermer: () => void;
  onLotCree: (lotId: string) => void;
}

export const NouvelleCapture: React.FC<Props> = ({ onFermer, onLotCree }) => {
  const [etape, setEtape] = useState<'selection' | 'traitement'>('selection');
  const [fichier, setFichier] = useState<File | null>(null);
  const [classe, setClasse] = useState('3e 2 (Mathématiques)');
  const [evaluation, setEvaluation] = useState('Devoir n°2 (sur 20)');

  const lancerTraitement = async () => {
    setEtape('traitement');

    try {
      // 1. Création du lot via API ou simulation locale
      const resCreation = await fetch('/api/v1/lots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enseignementId: 'ens-demo-1',
          evaluationId: 'eval-demo-1',
        }),
      }).catch(() => null);

      let lotId = 'lot-local-' + Date.now();
      if (resCreation && resCreation.ok) {
        const data = await resCreation.json();
        lotId = data.id;

        // Téléversement du document
        await fetch(`/api/v1/lots/${lotId}/documents`, {
          method: 'POST',
          headers: { 'Content-Type': 'image/jpeg' },
          body: fichier ? await fichier.arrayBuffer() : new Uint8Array([1, 2, 3]),
        }).catch(() => null);

        // Déclenchement OCR
        await fetch(`/api/v1/lots/${lotId}/extraction`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ horsLigne: false }),
        }).catch(() => null);
      }

      setTimeout(() => {
        onLotCree(lotId);
      }, 1000);
    } catch {
      setTimeout(() => {
        onLotCree('lot-local-' + Date.now());
      }, 1000);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-card">
        <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--bn-blue-dark)', marginBottom: 12 }}>
          Nouvelle capture de fiche de notes (Module 1)
        </h3>

        {etape === 'selection' ? (
          <div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 6 }}>
                Classe et Enseignement
              </label>
              <select
                value={classe}
                onChange={(e) => setClasse(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid var(--bn-gray-300)' }}
              >
                <option value="3e 2 (Mathématiques)">3e 2 — Mathématiques (Mme MENGUE)</option>
                <option value="4e 1 (Français)">4e 1 — Français</option>
                <option value="Terminale C (Physique)">Terminale C — Physique-Chimie</option>
              </select>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 6 }}>
                Évaluation cible
              </label>
              <select
                value={evaluation}
                onChange={(e) => setEvaluation(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid var(--bn-gray-300)' }}
              >
                <option value="Devoir n°2 (sur 20)">Devoir surveillé n°2 — Barème 0 à 20</option>
                <option value="Composition T1 (sur 20)">Composition Trimestre 1 — Barème 0 à 20</option>
              </select>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 6 }}>
                Photo / Scan de la fiche
              </label>
              <div
                style={{
                  border: '2px dashed var(--bn-gray-300)',
                  borderRadius: 8,
                  padding: 24,
                  textAlign: 'center',
                  backgroundColor: 'var(--bn-gray-50)',
                }}
              >
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={(e) => setFichier(e.target.files?.[0] ?? null)}
                  style={{ display: 'block', margin: '0 auto', marginBottom: 8 }}
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--bn-gray-500)' }}>
                  {fichier ? fichier.name : 'Ou laissez vide pour charger le spécimen de démonstration'}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <button type="button" className="btn-secondary" onClick={onFermer}>
                Annuler
              </button>
              <button type="button" className="btn-primary" onClick={lancerTraitement}>
                Lancer l'extraction OCR
              </button>
            </div>
          </div>
        ) : (
          <div style={{ padding: '32px 16px', textAlign: 'center' }}>
            <div
              style={{
                width: 48,
                height: 48,
                border: '4px solid var(--bn-blue-light)',
                borderTopColor: 'var(--bn-blue)',
                borderRadius: '50%',
                margin: '0 auto 16px',
                animation: 'spin 1s linear infinite',
              }}
            />
            <h4 style={{ fontWeight: 600, marginBottom: 8 }}>Reconnaissance optique en cours...</h4>
            <p style={{ fontSize: '0.85rem', color: 'var(--bn-gray-500)' }}>
              Segmentation des tableaux, alignement matricule / noms et calcul des bandes de confiance.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { useI18n } from '../i18n.js';
import type { FormulaireLot } from '../types.js';

interface ModalProps {
  formulaire: FormulaireLot;
  onConfirmer: () => void;
  onAnnuler: () => void;
  enCours: boolean;
}

export const ModalValidationRecapitulatif: React.FC<ModalProps> = ({
  formulaire,
  onConfirmer,
  onAnnuler,
  enCours,
}) => {
  const { t } = useI18n();
  const [attestationCochee, setAttestationCochee] = useState(false);

  // Statistiques du récapitulatif
  const totalLignes = formulaire.lignes.length;
  const notesNum = formulaire.lignes
    .filter((l) => l.note.statut === 'note' && l.note.valeur !== null && !isNaN(Number(l.note.valeur)))
    .map((l) => Number(l.note.valeur));

  const nbAbsents = formulaire.lignes.filter((l) => l.note.statut === 'absent').length;
  const nbNonEvalues = formulaire.lignes.filter((l) => l.note.statut === 'non_evalue').length;

  const moyenne =
    notesNum.length > 0
      ? (notesNum.reduce((acc, n) => acc + n, 0) / notesNum.length).toFixed(2)
      : '—';
  const minNote = notesNum.length > 0 ? Math.min(...notesNum) : '—';
  const maxNote = notesNum.length > 0 ? Math.max(...notesNum) : '—';

  return (
    <div className="modal-overlay">
      <div className="modal-card">
        <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--bn-blue-dark)', marginBottom: 8 }}>
          {t('recap.title')}
        </h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--bn-gray-500)', marginBottom: 16 }}>
          {t('recap.notice')}
        </p>

        {/* Grille d'indicateurs de contrôle */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 12,
            backgroundColor: 'var(--bn-gray-100)',
            padding: 16,
            borderRadius: 8,
            marginBottom: 20,
          }}
        >
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--bn-gray-500)' }}>
              {t('recap.totalEffectif')}
            </div>
            <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>
              {t('recap.students', { n: totalLignes })}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--bn-gray-500)' }}>
              {t('recap.notesRenseignees')}
            </div>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--bn-blue)' }}>
              {t('recap.grades', { n: notesNum.length })}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--bn-gray-500)' }}>
              {t('recap.absent', { n: nbAbsents })}
            </div>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--bn-orange-dark)' }}>
              {nbAbsents} / {nbNonEvalues}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--bn-gray-500)' }}>
              {t('recap.moyenneClasse')}
            </div>
            <div style={{ fontSize: '1.1rem', fontWeight: 700 }} className="tabular-nums">
              {moyenne} / {formulaire.evaluation.bareme.max}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--bn-gray-500)' }}>
              {t('recap.noteMinimale')}
            </div>
            <div style={{ fontSize: '1.1rem', fontWeight: 700 }} className="tabular-nums">
              {minNote}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--bn-gray-500)' }}>
              {t('recap.noteMaximale')}
            </div>
            <div style={{ fontSize: '1.1rem', fontWeight: 700 }} className="tabular-nums">
              {maxNote}
            </div>
          </div>
        </div>

        {/* Case d'attestation obligatoire */}
        <div
          style={{
            border: '2px solid var(--bn-orange)',
            backgroundColor: 'var(--bn-orange-light)',
            padding: 16,
            borderRadius: 8,
            marginBottom: 24,
            display: 'flex',
            alignItems: 'flex-start',
            gap: 12,
          }}
        >
          <input
            type="checkbox"
            id="attestation-conformite"
            checked={attestationCochee}
            onChange={(e) => setAttestationCochee(e.target.checked)}
            style={{ width: 20, height: 20, marginTop: 2, cursor: 'pointer' }}
          />
          <label
            htmlFor="attestation-conformite"
            style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--bn-gray-900)', cursor: 'pointer' }}
          >
            {t('recap.mustAcknowledge')}
          </label>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
          <button
            type="button"
            className="btn-secondary"
            onClick={onAnnuler}
            disabled={enCours}
          >
            {t('recap.back')}
          </button>
          <button
            type="button"
            className="btn-accent"
            onClick={onConfirmer}
            disabled={!attestationCochee || enCours}
            style={{ fontWeight: 700 }}
          >
            {enCours ? t('sync.item.sending') : t('recap.validate')}
          </button>
        </div>
      </div>
    </div>
  );
};

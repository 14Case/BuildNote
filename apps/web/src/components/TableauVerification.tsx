import React, { useState, useRef } from 'react';
import { useI18n } from '../i18n.js';
import type { FormulaireLot } from '../types.js';

interface Props {
  formulaire: FormulaireLot;
  onSauvegarderBrouillon: (f: FormulaireLot) => void;
  onDemanderValidation: (f: FormulaireLot) => void;
  onRetour: () => void;
}

export const TableauVerification: React.FC<Props> = ({
  formulaire: initialFormulaire,
  onSauvegarderBrouillon,
  onDemanderValidation,
  onRetour,
}) => {
  const { t } = useI18n();
  const [formulaire, setFormulaire] = useState<FormulaireLot>(initialFormulaire);
  const [indexLigneActive, setIndexLigneActive] = useState<number>(0);
  const [zoomImage, setZoomImage] = useState<number>(1);
  const [messageSauvegarde, setMessageSauvegarde] = useState<string | null>(null);

  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  // Mise à jour d'une note
  const modifierNote = (ligneIndex: number, nouvelleValeur: string | number, statut: 'note' | 'absent' | 'non_evalue' = 'note') => {
    setFormulaire((prev) => {
      const nouvellesLignes = prev.lignes.map((l) => {
        if (l.ligneIndex !== ligneIndex) return l;

        const valNum = Number(nouvelleValeur);
        const bareme = prev.evaluation.bareme;
        const horsBareme = statut === 'note' && !isNaN(valNum) && (valNum < bareme.min || valNum > bareme.max);

        return {
          ...l,
          horsBareme,
          note: {
            ...l.note,
            valeur: statut === 'note' ? (nouvelleValeur === '' ? null : nouvelleValeur) : null,
            statut,
            confiance: {
              ...l.note.confiance,
              bande: 'haute' as const, // marquée haute dès qu'un humain a corrigé/validé
            },
            modifieManuellement: true,
          },
        };
      });

      return {
        ...prev,
        lignes: nouvellesLignes,
      };
    });
  };

  // Naviguer directement vers la prochaine cellule douteuse
  const allerCelluleDouteuseSuivante = () => {
    const indicesDouteux = formulaire.lignes
      .filter((l) => l.note.confiance.bande !== 'haute' || l.horsBareme || !l.eleveId)
      .map((l) => l.ligneIndex);

    if (indicesDouteux.length === 0) return;

    const prochain = indicesDouteux.find((idx) => idx > indexLigneActive) ?? indicesDouteux[0];
    if (prochain !== undefined) {
      setIndexLigneActive(prochain);
      inputsRef.current[prochain]?.focus();
      inputsRef.current[prochain]?.select();
    }
  };

  const sauvegarder = () => {
    onSauvegarderBrouillon(formulaire);
    setMessageSauvegarde(t('verify.saved'));
    setTimeout(() => setMessageSauvegarde(null), 3000);
  };

  const totalLignes = formulaire.lignes.length;
  const verifiees = formulaire.lignes.filter((l) => l.note.confiance.bande === 'haute' && !l.horsBareme).length;
  const pct = totalLignes > 0 ? Math.round((verifiees / totalLignes) * 100) : 100;

  return (
    <div style={{ padding: '16px 24px', maxWidth: 1400, margin: '0 auto' }}>
      {/* Barre d'en-tête de vérification */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
          backgroundColor: 'var(--bn-white)',
          padding: '12px 20px',
          borderRadius: 8,
          border: '1px solid var(--bn-gray-200)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button type="button" onClick={onRetour} className="btn-secondary" style={{ padding: '6px 12px' }}>
            {t('nav.back')}
          </button>
          <div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--bn-blue-dark)' }}>
              {t('verify.title')} — {formulaire.classe.libelle} · {formulaire.matiere.libelleFr}
            </h2>
            <div style={{ fontSize: '0.8rem', color: 'var(--bn-gray-500)' }}>
              {formulaire.evaluation.libelle} ({formulaire.evaluation.bareme.min}–{formulaire.evaluation.bareme.max})
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Progression */}
          <div style={{ textAlign: 'right', marginRight: 8 }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 600 }}>
              {t('verify.progress', { pct })} ({verifiees}/{totalLignes})
            </div>
            <div
              style={{
                width: 120,
                height: 6,
                backgroundColor: 'var(--bn-gray-200)',
                borderRadius: 3,
                overflow: 'hidden',
                marginTop: 4,
              }}
            >
              <div
                style={{
                  width: `${pct}%`,
                  height: '100%',
                  backgroundColor: pct === 100 ? 'var(--bn-success)' : 'var(--bn-blue)',
                  transition: 'width 0.3s ease',
                }}
              />
            </div>
          </div>

          <button
            type="button"
            onClick={allerCelluleDouteuseSuivante}
            className="btn-accent"
            style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem' }}
          >
            ⚡ {t('verify.cell.nextDoubtful')}
          </button>

          <button type="button" onClick={sauvegarder} className="btn-secondary" style={{ fontSize: '0.85rem' }}>
            {t('verify.save')}
          </button>

          <button
            type="button"
            onClick={() => onDemanderValidation(formulaire)}
            className="btn-primary"
            style={{ fontWeight: 700, fontSize: '0.85rem' }}
          >
            {t('verify.toRecap')}
          </button>
        </div>
      </div>

      {messageSauvegarde && (
        <div
          style={{
            padding: '8px 16px',
            backgroundColor: '#ecfdf5',
            color: '#065f46',
            borderRadius: 6,
            marginBottom: 12,
            fontSize: '0.85rem',
          }}
        >
          ✓ {messageSauvegarde}
        </div>
      )}

      {/* Vue Bi-partite : Image source à gauche + Tableau de saisie à droite */}
      <div style={{ display: 'grid', gridTemplateColumns: '40% 60%', gap: 16, alignItems: 'start' }}>
        {/* Document physique numérisé */}
        <div
          style={{
            background: 'var(--bn-white)',
            borderRadius: 8,
            border: '1px solid var(--bn-gray-200)',
            overflow: 'hidden',
            position: 'sticky',
            top: 80,
          }}
        >
          <div
            style={{
              padding: '8px 16px',
              backgroundColor: 'var(--bn-gray-100)',
              borderBottom: '1px solid var(--bn-gray-200)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{t('verify.source.title')}</span>
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                type="button"
                className="btn-secondary"
                style={{ padding: '2px 8px', fontSize: '0.75rem' }}
                onClick={() => setZoomImage((z) => Math.max(0.7, z - 0.2))}
              >
                {t('verify.source.zoomOut')}
              </button>
              <button
                type="button"
                className="btn-secondary"
                style={{ padding: '2px 8px', fontSize: '0.75rem' }}
                onClick={() => setZoomImage(1)}
              >
                100%
              </button>
              <button
                type="button"
                className="btn-secondary"
                style={{ padding: '2px 8px', fontSize: '0.75rem' }}
                onClick={() => setZoomImage((z) => Math.min(2.5, z + 0.2))}
              >
                {t('verify.source.zoomIn')}
              </button>
            </div>
          </div>

          <div
            style={{
              height: 600,
              overflow: 'auto',
              padding: 16,
              backgroundColor: '#334155',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <div
              style={{
                transform: `scale(${zoomImage})`,
                transformOrigin: 'top center',
                transition: 'transform 0.15s ease-out',
                background: 'white',
                padding: 24,
                boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
                borderRadius: 4,
                minWidth: 320,
              }}
            >
              <div style={{ borderBottom: '2px solid #000', paddingBottom: 8, marginBottom: 12 }}>
                <div style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>{'RÉPUBLIQUE DU CAMEROUN'}</div>
                <div style={{ fontSize: '0.75rem' }}>{'COLLÈGE PILOTE DE DÉMONSTRATION'}</div>
                <div style={{ fontSize: '0.8rem', marginTop: 4 }}>
                  {formulaire.classe.libelle} · {formulaire.evaluation.libelle}
                </div>
              </div>
              <div style={{ fontSize: '0.75rem', color: '#475569' }}>
                Ligne #{indexLigneActive + 1} · {formulaire.lignes[indexLigneActive]?.nomReconnu}
              </div>
            </div>
          </div>
        </div>

        {/* Tableau prérempli avec scores de confiance */}
        <div style={{ overflowX: 'auto' }}>
          <table className="table-container">
            <thead>
              <tr>
                <th style={{ width: 40 }}>#</th>
                <th>{t('verify.col.student')}</th>
                <th style={{ width: 140 }}>{t('verify.col.grade')}</th>
                <th style={{ width: 140 }}>{t('verify.col.confidence')}</th>
                <th>{t('verify.cell.hypotheses')}</th>
                <th style={{ width: 100 }}>{t('verify.col.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {formulaire.lignes.map((ligne) => {
                const estActive = ligne.ligneIndex === indexLigneActive;
                const bande = ligne.note.confiance.bande;

                return (
                  <tr
                    key={ligne.ligneIndex}
                    style={{
                      backgroundColor: estActive ? 'var(--bn-blue-light)' : 'transparent',
                    }}
                    onClick={() => setIndexLigneActive(ligne.ligneIndex)}
                  >
                    <td style={{ fontWeight: 600, color: 'var(--bn-gray-500)', fontSize: '0.85rem' }}>
                      {ligne.ligneIndex + 1}
                    </td>

                    {/* Élève */}
                    <td>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{ligne.nomReconnu}</div>
                      {!ligne.eleveId ? (
                        <span
                          style={{
                            fontSize: '0.7rem',
                            color: '#b91c1c',
                            backgroundColor: '#fee2e2',
                            padding: '1px 6px',
                            borderRadius: 4,
                            fontWeight: 600,
                          }}
                        >
                          ⚠️ {t('verify.row.unmatched')}
                        </span>
                      ) : (
                        <div style={{ fontSize: '0.75rem', color: 'var(--bn-gray-500)' }}>
                          {ligne.nomOfficiel} ({Math.round(ligne.scoreRapprochement * 100)}%)
                        </div>
                      )}
                    </td>

                    {/* Saisie de la note */}
                    <td>
                      <input
                        ref={(el) => {
                          inputsRef.current[ligne.ligneIndex] = el;
                        }}
                        type="text"
                        value={
                          ligne.note.statut === 'absent'
                            ? 'ABS'
                            : ligne.note.statut === 'non_evalue'
                            ? 'NE'
                            : ligne.note.valeur ?? ''
                        }
                        onChange={(e) => modifierNote(ligne.ligneIndex, e.target.value)}
                        onFocus={() => setIndexLigneActive(ligne.ligneIndex)}
                        className="tabular-nums"
                        style={{
                          width: '100%',
                          padding: '6px 8px',
                          borderRadius: 4,
                          border: ligne.horsBareme
                            ? '2px solid var(--bn-danger)'
                            : estActive
                            ? '2px solid var(--bn-orange)'
                            : '1px solid var(--bn-gray-300)',
                          fontWeight: 700,
                          fontSize: '0.95rem',
                          textAlign: 'center',
                          backgroundColor:
                            ligne.note.statut !== 'note' ? 'var(--bn-gray-100)' : 'var(--bn-white)',
                        }}
                      />
                      {ligne.horsBareme && (
                        <div style={{ fontSize: '0.7rem', color: 'var(--bn-danger)', fontWeight: 600, marginTop: 2 }}>
                          {t('verify.alert.outOfScale', {
                            min: formulaire.evaluation.bareme.min,
                            max: formulaire.evaluation.bareme.max,
                          })}
                        </div>
                      )}
                    </td>

                    {/* Badge de confiance OCR */}
                    <td>
                      <span
                        className={`badge-confidence-${bande}`}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          padding: '2px 8px',
                          borderRadius: 4,
                          fontSize: '0.75rem',
                        }}
                      >
                        {bande === 'basse' && '⚠️ '}
                        {t(`verify.confidence.${bande}` as any)}
                      </span>
                    </td>

                    {/* Hypothèses OCR alternatives */}
                    <td>
                      {ligne.note.hypotheses && ligne.note.hypotheses.length > 0 ? (
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                          {ligne.note.hypotheses.map((h, i) => (
                            <button
                              key={i}
                              type="button"
                              onClick={() => modifierNote(ligne.ligneIndex, h.texte)}
                              style={{
                                padding: '1px 6px',
                                fontSize: '0.75rem',
                                border: '1px solid var(--bn-gray-300)',
                                background: 'var(--bn-white)',
                                borderRadius: 4,
                              }}
                              title={`Score: ${Math.round(h.score * 100)}%`}
                            >
                              {h.texte}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <span style={{ fontSize: '0.75rem', color: 'var(--bn-gray-500)' }}>—</span>
                      )}
                    </td>

                    {/* Raccourcis d'absence */}
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button
                          type="button"
                          className="btn-secondary"
                          style={{ padding: '2px 6px', fontSize: '0.7rem' }}
                          onClick={() => modifierNote(ligne.ligneIndex, '', 'absent')}
                        >
                          {t('verify.cell.markAbsent')}
                        </button>
                        <button
                          type="button"
                          className="btn-secondary"
                          style={{ padding: '2px 6px', fontSize: '0.7rem' }}
                          onClick={() => modifierNote(ligne.ligneIndex, '', 'non_evalue')}
                        >
                          {t('verify.cell.markNotEvaluated')}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

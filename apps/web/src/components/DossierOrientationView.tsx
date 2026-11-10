import React, { useState } from 'react';
import { useI18n } from '../i18n.js';
import type { EleveSituation } from '../types.js';

interface DossierOrientationViewProps {
  eleve: EleveSituation;
  dossierInitial?: any;
  csrfToken?: string;
  onRetour: () => void;
  onDossierMisAJour?: (dossier: any) => void;
}

export const DossierOrientationView: React.FC<DossierOrientationViewProps> = ({
  eleve,
  dossierInitial,
  csrfToken,
  onRetour,
  onDossierMisAJour,
}) => {
  const { t } = useI18n();

  const [dossier, setDossier] = useState<any>(dossierInitial);
  const [chargement, setChargement] = useState<boolean>(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [ongletActif, setOngletActif] = useState<'scenarios' | 'facteurs' | 'donnees' | 'repartition' | 'alternatives' | 'incertitudes'>('scenarios');
  const [scenarioSelectionneIndex, setScenarioSelectionneIndex] = useState<number>(0);

  const regenererDossier = async () => {
    setChargement(true);
    setErreur(null);

    try {
      const res = await fetch('/api/v1/orientation/dossiers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(csrfToken ? { 'x-csrf-token': csrfToken } : {}),
        },
        body: JSON.stringify({
          eleveId: eleve.id,
          anneeScolaireId: eleve.anneeScolaireId,
          langue: 'fr',
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        throw new Error(errJson?.message || t('error.generic'));
      }

      const nouveau = await res.json();
      setDossier(nouveau);
      setScenarioSelectionneIndex(0);
      if (onDossierMisAJour) onDossierMisAJour(nouveau);
    } catch (err: any) {
      setErreur(err.message || t('error.generic'));
    } finally {
      setChargement(false);
    }
  };

  const scenarios = dossier?.scenarios ?? [];
  const scenarioActif = scenarios[scenarioSelectionneIndex];
  const explication = scenarioActif?.explication;

  return (
    <div style={{ padding: '24px', maxWidth: 1200, margin: '0 auto' }}>
      {/* Barre d'action supérieure */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <button
          type="button"
          className="btn-secondary"
          onClick={onRetour}
          style={{ display: 'flex', alignItems: 'center', gap: 6 }}
        >
          ← {t('dossier.backToDashboard')}
        </button>

        <button
          type="button"
          className="btn-accent"
          onClick={regenererDossier}
          disabled={chargement}
        >
          {chargement ? t('dossier.generating') : t('dossier.regenerate')}
        </button>
      </div>

      {/* En-tête de l'élève */}
      <div
        style={{
          background: 'var(--bn-white)',
          padding: 20,
          borderRadius: 8,
          border: '1px solid var(--bn-gray-200)',
          marginBottom: 16,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--bn-blue-dark)' }}>
              {eleve.nom} {eleve.prenoms}
            </h2>
            <p style={{ fontSize: '0.9rem', color: 'var(--bn-gray-500)', marginTop: 4 }}>
              {t('dossier.studentInfo', { name: `${eleve.nom} ${eleve.prenoms}`, classe: eleve.classeLibelle })}
              {eleve.matricule ? ` · Matricule : ${eleve.matricule}` : ''}
            </p>
          </div>

          <div style={{ textAlign: 'right' }}>
            <span
              style={{
                display: 'inline-block',
                padding: '4px 10px',
                borderRadius: 999,
                fontSize: '0.8rem',
                fontWeight: 600,
                backgroundColor: 'var(--bn-blue-light)',
                color: 'var(--bn-blue-dark)',
                border: '1px solid #bfdbfe',
              }}
            >
              {t('dossier.metadata', {
                date: dossier ? new Date().toLocaleDateString() : '—',
                palier: dossier?.demande?.palier ?? 'premier_cycle_vers_second_cycle',
              })}
            </span>
          </div>
        </div>

        {/* Bannière éthique & garde-fou non-prescription (EF-M2-19/26) */}
        <div
          style={{
            marginTop: 16,
            padding: '12px 16px',
            backgroundColor: '#eff6ff',
            borderLeft: '4px solid var(--bn-blue)',
            borderRadius: 4,
            fontSize: '0.875rem',
            color: 'var(--bn-gray-700)',
            lineHeight: 1.5,
          }}
        >
          {t('dossier.ethicsBanner')}
        </div>
      </div>

      {erreur && (
        <div
          style={{
            padding: '12px 16px',
            backgroundColor: '#fee2e2',
            color: '#b91c1c',
            borderRadius: 6,
            marginBottom: 16,
            fontSize: '0.875rem',
          }}
        >
          {erreur}
        </div>
      )}

      {!dossier || scenarios.length === 0 ? (
        <div
          style={{
            background: 'var(--bn-white)',
            padding: 40,
            borderRadius: 8,
            border: '1px solid var(--bn-gray-200)',
            textAlign: 'center',
          }}
        >
          <p style={{ color: 'var(--bn-gray-500)', marginBottom: 16 }}>{t('dossier.noScenarios')}</p>
          <button
            type="button"
            className="btn-primary"
            onClick={regenererDossier}
            disabled={chargement}
          >
            {chargement ? t('dossier.generating') : t('dossier.regenerate')}
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 20 }}>
          {/* Colonne gauche : Liste des scénarios classés */}
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--bn-gray-900)', marginBottom: 12 }}>
              {t('dossier.scenariosTitle')}
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {scenarios.map((sc: any, index: number) => {
                const estSelectionne = index === scenarioSelectionneIndex;
                const score = Math.round(sc.scenario.score ?? 0);
                const verdict = sc.scenario.verdict ?? 'retenu';

                return (
                  <div
                    key={sc.scenario.filiere_id || index}
                    onClick={() => setScenarioSelectionneIndex(index)}
                    style={{
                      padding: 14,
                      borderRadius: 8,
                      border: '2px solid',
                      borderColor: estSelectionne ? 'var(--bn-blue)' : 'var(--bn-gray-200)',
                      backgroundColor: estSelectionne ? 'var(--bn-blue-light)' : 'var(--bn-white)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--bn-blue-dark)' }}>
                        #{sc.scenario.rang ?? index + 1}
                      </span>
                      <span
                        style={{
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          padding: '2px 8px',
                          borderRadius: 999,
                          backgroundColor:
                            verdict === 'retenu'
                              ? '#dcfce7'
                              : verdict === 'sous_condition'
                                ? '#fef3c7'
                                : '#fee2e2',
                          color:
                            verdict === 'retenu'
                              ? '#166534'
                              : verdict === 'sous_condition'
                                ? '#92400e'
                                : '#991b1b',
                        }}
                      >
                        {verdict === 'retenu'
                          ? t('dossier.verdict.retenu')
                          : verdict === 'sous_condition'
                            ? t('dossier.verdict.sous_condition')
                            : t('dossier.verdict.ecarte')}
                      </span>
                    </div>

                    <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--bn-gray-900)', marginBottom: 6 }}>
                      {sc.scenario.filiere_libelle}
                    </h4>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--bn-orange-dark)' }}>
                        {t('dossier.scoreLabel', { score })}
                      </span>

                      {/* Badges */}
                      <div style={{ display: 'flex', gap: 4 }}>
                        {(sc.scenario.badges ?? []).map((b: string) => (
                          <span
                            key={b}
                            style={{
                              fontSize: '0.7rem',
                              padding: '1px 6px',
                              borderRadius: 4,
                              backgroundColor: 'var(--bn-gray-200)',
                              color: 'var(--bn-gray-700)',
                            }}
                          >
                            {b === 'sous_condition'
                              ? t('dossier.badge.sous_condition')
                              : b === 'metier_en_tension'
                                ? t('dossier.badge.metier_en_tension')
                                : b === 'secteur_prioritaire'
                                  ? t('dossier.badge.secteur_prioritaire')
                                  : b}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Colonne droite : Détails du scénario & 5 blocs d'explication */}
          <div
            style={{
              background: 'var(--bn-white)',
              borderRadius: 8,
              border: '1px solid var(--bn-gray-200)',
              padding: 20,
            }}
          >
            {scenarioActif && (
              <div>
                <div style={{ borderBottom: '1px solid var(--bn-gray-200)', paddingBottom: 14, marginBottom: 16 }}>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--bn-blue-dark)' }}>
                    {scenarioActif.scenario.filiere_libelle}
                  </h3>
                  <p style={{ fontSize: '0.85rem', color: 'var(--bn-gray-500)', marginTop: 4 }}>
                    {t('dossier.scoreLabel', { score: Math.round(scenarioActif.scenario.score ?? 0) })}
                  </p>
                </div>

                {/* Onglets des 5 blocs d'explication */}
                <div style={{ display: 'flex', gap: 6, borderBottom: '1px solid var(--bn-gray-200)', paddingBottom: 10, marginBottom: 16, overflowX: 'auto' }}>
                  <button
                    type="button"
                    onClick={() => setOngletActif('scenarios')}
                    style={{
                      padding: '6px 12px',
                      borderRadius: 6,
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      backgroundColor: ongletActif === 'scenarios' ? 'var(--bn-blue)' : 'var(--bn-gray-100)',
                      color: ongletActif === 'scenarios' ? 'var(--bn-white)' : 'var(--bn-gray-700)',
                    }}
                  >
                    {t('dossier.tab.factors')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setOngletActif('repartition')}
                    style={{
                      padding: '6px 12px',
                      borderRadius: 6,
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      backgroundColor: ongletActif === 'repartition' ? 'var(--bn-blue)' : 'var(--bn-gray-100)',
                      color: ongletActif === 'repartition' ? 'var(--bn-white)' : 'var(--bn-gray-700)',
                    }}
                  >
                    {t('dossier.tab.breakdown')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setOngletActif('donnees')}
                    style={{
                      padding: '6px 12px',
                      borderRadius: 6,
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      backgroundColor: ongletActif === 'donnees' ? 'var(--bn-blue)' : 'var(--bn-gray-100)',
                      color: ongletActif === 'donnees' ? 'var(--bn-white)' : 'var(--bn-gray-700)',
                    }}
                  >
                    {t('dossier.tab.data')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setOngletActif('alternatives')}
                    style={{
                      padding: '6px 12px',
                      borderRadius: 6,
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      backgroundColor: ongletActif === 'alternatives' ? 'var(--bn-blue)' : 'var(--bn-gray-100)',
                      color: ongletActif === 'alternatives' ? 'var(--bn-white)' : 'var(--bn-gray-700)',
                    }}
                  >
                    {t('dossier.tab.alternatives')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setOngletActif('incertitudes')}
                    style={{
                      padding: '6px 12px',
                      borderRadius: 6,
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      backgroundColor: ongletActif === 'incertitudes' ? 'var(--bn-blue)' : 'var(--bn-gray-100)',
                      color: ongletActif === 'incertitudes' ? 'var(--bn-white)' : 'var(--bn-gray-700)',
                    }}
                  >
                    {t('dossier.tab.uncertainties')}
                  </button>
                </div>

                {/* Contenu de l'onglet Facteurs déterminants */}
                {ongletActif === 'scenarios' && (
                  <div>
                    <h5 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--bn-gray-700)', marginBottom: 10 }}>
                      {t('dossier.tab.factors')}
                    </h5>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
                      {(explication?.facteurs_determinants ?? []).map((f: any, idx: number) => {
                        const positive = f.contribution >= 0;
                        return (
                          <div
                            key={idx}
                            style={{
                              padding: '8px 12px',
                              borderRadius: 6,
                              backgroundColor: positive ? '#f0fdf4' : '#fef2f2',
                              border: `1px solid ${positive ? '#bbf7d0' : '#fecaca'}`,
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                            }}
                          >
                            <span style={{ fontSize: '0.85rem', color: 'var(--bn-gray-900)' }}>
                              {f.cle_gabarit}
                            </span>
                            <span
                              style={{
                                fontSize: '0.8rem',
                                fontWeight: 700,
                                color: positive ? '#166534' : '#991b1b',
                              }}
                            >
                              {positive ? `+${f.contribution}` : `${f.contribution}`}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    {/* Établissements & Métiers */}
                    <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--bn-gray-200)' }}>
                      <h5 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--bn-gray-700)', marginBottom: 8 }}>
                        {t('dossier.institutions')}
                      </h5>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
                        {(scenarioActif.scenario.etablissements ?? []).map((et: any) => (
                          <div
                            key={et.etablissement_reference_id}
                            style={{
                              padding: '6px 10px',
                              borderRadius: 4,
                              backgroundColor: 'var(--bn-gray-100)',
                              fontSize: '0.8rem',
                              display: 'flex',
                              justifyContent: 'space-between',
                            }}
                          >
                            <span>{et.libelle}</span>
                            <span style={{ color: 'var(--bn-gray-500)' }}>
                              {et.distance_km} km {et.internat ? '(Internat)' : ''}
                            </span>
                          </div>
                        ))}
                      </div>

                      <h5 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--bn-gray-700)', marginBottom: 8 }}>
                        {t('dossier.careers')}
                      </h5>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {(scenarioActif.scenario.metiers ?? []).map((m: any) => (
                          <span
                            key={m.id}
                            style={{
                              padding: '4px 8px',
                              borderRadius: 4,
                              backgroundColor: 'var(--bn-blue-light)',
                              color: 'var(--bn-blue-dark)',
                              fontSize: '0.75rem',
                              fontWeight: 500,
                            }}
                          >
                            {m.libelle}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Contenu de l'onglet Répartition du score */}
                {ongletActif === 'repartition' && (
                  <div>
                    <h5 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--bn-gray-700)', marginBottom: 12 }}>
                      {t('dossier.tab.breakdown')}
                    </h5>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {Object.entries(explication?.repartition_score?.parts ?? {}).map(([cat, part]: [string, any]) => {
                        const pct = Math.round(Number(part) * 100);
                        return (
                          <div key={cat}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: 4 }}>
                              <span style={{ fontWeight: 500, color: 'var(--bn-gray-700)' }}>{cat}</span>
                              <span style={{ fontWeight: 700, color: 'var(--bn-blue-dark)' }}>{pct}%</span>
                            </div>
                            <div style={{ height: 8, borderRadius: 4, backgroundColor: 'var(--bn-gray-200)', overflow: 'hidden' }}>
                              <div
                                style={{
                                  height: '100%',
                                  width: `${pct}%`,
                                  backgroundColor: 'var(--bn-blue)',
                                  borderRadius: 4,
                                }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Contenu de l'onglet Données utilisées */}
                {ongletActif === 'donnees' && (
                  <div>
                    <h5 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--bn-gray-700)', marginBottom: 10 }}>
                      {t('dossier.tab.data')}
                    </h5>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {(explication?.donnees_utilisees ?? []).map((d: any, idx: number) => (
                        <div
                          key={idx}
                          style={{
                            padding: '8px 12px',
                            borderRadius: 6,
                            backgroundColor: 'var(--bn-gray-100)',
                            fontSize: '0.8rem',
                            display: 'flex',
                            justifyContent: 'space-between',
                          }}
                        >
                          <div>
                            <p style={{ fontWeight: 600, color: 'var(--bn-gray-900)' }}>{d.libelle}</p>
                            <p style={{ color: 'var(--bn-gray-500)', fontSize: '0.75rem' }}>Source : {d.source}</p>
                          </div>
                          <span
                            style={{
                              padding: '2px 8px',
                              borderRadius: 4,
                              backgroundColor: d.fiabilite === 'elevee' ? '#dcfce7' : '#fef3c7',
                              color: d.fiabilite === 'elevee' ? '#166534' : '#92400e',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              alignSelf: 'center',
                            }}
                          >
                            {d.fiabilite}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Contenu de l'onglet Alternatives écartées */}
                {ongletActif === 'alternatives' && (
                  <div>
                    <h5 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--bn-gray-700)', marginBottom: 10 }}>
                      {t('dossier.tab.alternatives')}
                    </h5>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {(explication?.alternatives_ecartees ?? []).map((alt: any, idx: number) => (
                        <div
                          key={idx}
                          style={{
                            padding: '8px 12px',
                            borderRadius: 6,
                            backgroundColor: 'var(--bn-gray-100)',
                            borderLeft: '4px solid var(--bn-orange)',
                            fontSize: '0.8rem',
                          }}
                        >
                          <p style={{ fontWeight: 600, color: 'var(--bn-gray-900)' }}>{alt.filiere_libelle}</p>
                          <p style={{ color: 'var(--bn-gray-700)', fontSize: '0.75rem', marginTop: 2 }}>
                            Raison : {alt.raison} (Score : {alt.score})
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Contenu de l'onglet Zones d'incertitude */}
                {ongletActif === 'incertitudes' && (
                  <div>
                    <h5 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--bn-gray-700)', marginBottom: 10 }}>
                      {t('dossier.tab.uncertainties')}
                    </h5>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {(explication?.zones_incertitude ?? []).map((zi: any, idx: number) => (
                        <div
                          key={idx}
                          style={{
                            padding: '8px 12px',
                            borderRadius: 6,
                            backgroundColor: '#fffbeb',
                            border: '1px solid #fef3c7',
                            fontSize: '0.8rem',
                            color: '#92400e',
                          }}
                        >
                          {zi.cle_gabarit}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

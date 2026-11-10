import React, { useState, useEffect } from 'react';
import { useI18n } from '../i18n.js';
import type { EleveSituation, SituationClasse } from '../types.js';

interface DashboardSituationProps {
  csrfToken?: string;
  onOuvrirQuestionnaire: (eleve: EleveSituation) => void;
  onOuvrirDossier: (eleve: EleveSituation) => void;
}

const SITUATION_DEMO: SituationClasse = {
  classe: {
    id: 'classe-demo-3e2',
    libelle: '3e 2',
    anneeScolaireId: 'annee-demo-2026',
  },
  stats: {
    totalEleves: 5,
    avecConsentement: 4,
    avecQuestionnaire: 3,
    avecDossier: 2,
  },
  derniereConsultation: new Date().toISOString(),
  eleves: [
    {
      id: 'el-1',
      nom: 'NKOLO',
      prenoms: 'Aristide',
      matricule: 'MAT-2026-001',
      classeId: 'classe-demo-3e2',
      classeLibelle: '3e 2',
      anneeScolaireId: 'annee-demo-2026',
      consentement: {
        eleve: true,
        parents: true,
        valide: true,
        enregistreLe: '2026-10-15T09:30:00Z',
      },
      questionnaire: {
        complet: true,
        centresInteret: ['Informatique & Numérique', 'Sciences & Recherche'],
        matieresPreferees: ['Mathématiques', 'Physique'],
        aspirationsMetiers: ['Ingénieur logiciel', 'Data scientist'],
        avisParents: {
          filieres_souhaitees: ['Série C — Sciences & Mathématiques'],
          priorite: 5,
        },
        modifieLe: '2026-10-15T10:00:00Z',
      },
      dernierDossier: {
        id: 'dos-001',
        palier: 'premier_cycle_vers_second_cycle',
        genereLe: '2026-10-15T11:00:00Z',
        recommandation: 'Série C — Sciences & Mathématiques',
        score: 88,
      },
      nbNotes: 6,
    },
    {
      id: 'el-2',
      nom: 'ABENA',
      prenoms: 'Clarisse',
      matricule: 'MAT-2026-002',
      classeId: 'classe-demo-3e2',
      classeLibelle: '3e 2',
      anneeScolaireId: 'annee-demo-2026',
      consentement: {
        eleve: true,
        parents: true,
        valide: true,
        enregistreLe: '2026-10-16T14:10:00Z',
      },
      questionnaire: {
        complet: true,
        centresInteret: ['Lettres & Communication', 'Arts & Design'],
        matieresPreferees: ['Français', 'Anglais', 'Histoire-Géographie'],
        aspirationsMetiers: ['Journaliste', 'Traductrice'],
        avisParents: {
          filieres_souhaitees: ['Série A — Lettres & Philosophie'],
          priorite: 4,
        },
        modifieLe: '2026-10-16T14:30:00Z',
      },
      dernierDossier: {
        id: 'dos-002',
        palier: 'premier_cycle_vers_second_cycle',
        genereLe: '2026-10-16T15:00:00Z',
        recommandation: 'Série A — Lettres & Philosophie',
        score: 84,
      },
      nbNotes: 5,
    },
    {
      id: 'el-3',
      nom: 'MBALLA ONDOA',
      prenoms: 'Jean Pierre',
      matricule: 'MAT-2026-003',
      classeId: 'classe-demo-3e2',
      classeLibelle: '3e 2',
      anneeScolaireId: 'annee-demo-2026',
      consentement: {
        eleve: true,
        parents: true,
        valide: true,
        enregistreLe: '2026-10-18T08:00:00Z',
      },
      questionnaire: {
        complet: true,
        centresInteret: ['Ingénierie & Mécanique'],
        matieresPreferees: ['Mathématiques', 'Informatique'],
        aspirationsMetiers: ['Technicien supérieur', 'Électrotechnicien'],
        avisParents: {
          filieres_souhaitees: ['Série F — Technologies Industrielles'],
          priorite: 4,
        },
        modifieLe: '2026-10-18T08:30:00Z',
      },
      dernierDossier: null,
      nbNotes: 4,
    },
    {
      id: 'el-4',
      nom: 'ETONG',
      prenoms: 'Marie',
      matricule: 'MAT-2026-004',
      classeId: 'classe-demo-3e2',
      classeLibelle: '3e 2',
      anneeScolaireId: 'annee-demo-2026',
      consentement: {
        eleve: true,
        parents: true,
        valide: true,
        enregistreLe: '2026-10-19T11:20:00Z',
      },
      questionnaire: {
        complet: false,
        centresInteret: [],
        matieresPreferees: [],
        aspirationsMetiers: [],
        avisParents: null,
        modifieLe: null,
      },
      dernierDossier: null,
      nbNotes: 5,
    },
    {
      id: 'el-5',
      nom: 'KAMGA',
      prenoms: 'Yao',
      matricule: 'MAT-2026-005',
      classeId: 'classe-demo-3e2',
      classeLibelle: '3e 2',
      anneeScolaireId: 'annee-demo-2026',
      consentement: {
        eleve: false,
        parents: false,
        valide: false,
        enregistreLe: null,
      },
      questionnaire: {
        complet: false,
        centresInteret: [],
        matieresPreferees: [],
        aspirationsMetiers: [],
        avisParents: null,
        modifieLe: null,
      },
      dernierDossier: null,
      nbNotes: 3,
    },
  ],
};

export const DashboardSituation: React.FC<DashboardSituationProps> = ({
  csrfToken: _csrfToken,
  onOuvrirQuestionnaire,
  onOuvrirDossier,
}) => {
  const { t } = useI18n();

  const [situation, setSituation] = useState<SituationClasse>(SITUATION_DEMO);
  const [chargement, setChargement] = useState<boolean>(false);
  const [recherche, setRecherche] = useState<string>('');
  const [filtreConsentement, setFiltreConsentement] = useState<'tous' | 'avec' | 'sans'>('tous');

  const chargerSituation = async () => {
    setChargement(true);
    try {
      // 1. Chercher les classes de l'établissement
      const resClasses = await fetch('/api/v1/enseignements');
      if (!resClasses.ok) throw new Error('Impossible de charger les enseignements');
      const enseignements = await resClasses.json();
      const classeId = enseignements[0]?.classeId;

      if (classeId) {
        const resSit = await fetch(`/api/v1/orientation/classes/${classeId}/situation`);
        if (resSit.ok) {
          const data: SituationClasse = await resSit.json();
          setSituation(data);
        }
      }
    } catch {
      // Conserver les données de démo si non connecté ou hors ligne
    } finally {
      setChargement(false);
    }
  };

  useEffect(() => {
    chargerSituation();
  }, []);

  const elevesFiltres = situation.eleves.filter((e) => {
    const terme = recherche.toLowerCase().trim();
    const matchNom =
      !terme ||
      e.nom.toLowerCase().includes(terme) ||
      e.prenoms.toLowerCase().includes(terme) ||
      (e.matricule && e.matricule.toLowerCase().includes(terme));

    const matchConsent =
      filtreConsentement === 'tous' ||
      (filtreConsentement === 'avec' && e.consentement.valide) ||
      (filtreConsentement === 'sans' && !e.consentement.valide);

    return matchNom && matchConsent;
  });

  return (
    <div style={{ padding: '24px', maxWidth: 1200, margin: '0 auto' }}>
      {/* Barre supérieure : Titre et action à la demande */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 16,
          marginBottom: 20,
        }}
      >
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--bn-blue-dark)' }}>
            {t('dashboard.title')}
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--bn-gray-500)', marginTop: 2 }}>
            Classe : {situation.classe.libelle} · {t('dashboard.lastRefresh', { date: new Date(situation.derniereConsultation).toLocaleTimeString() })}
          </p>
        </div>

        <button
          type="button"
          className="btn-secondary"
          onClick={chargerSituation}
          disabled={chargement}
          style={{ display: 'flex', alignItems: 'center', gap: 8 }}
        >
          <span>↻</span>
          <span>{chargement ? '…' : t('dashboard.refresh')}</span>
        </button>
      </div>

      {/* Cartes KPI */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 16,
          marginBottom: 24,
        }}
      >
        <div
          style={{
            background: 'var(--bn-white)',
            padding: 16,
            borderRadius: 8,
            border: '1px solid var(--bn-gray-200)',
          }}
        >
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--bn-gray-500)', textTransform: 'uppercase' }}>
            {t('dashboard.kpi.totalStudents')}
          </span>
          <p style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--bn-gray-900)', marginTop: 4 }}>
            {situation.stats.totalEleves}
          </p>
        </div>

        <div
          style={{
            background: 'var(--bn-white)',
            padding: 16,
            borderRadius: 8,
            border: '1px solid var(--bn-gray-200)',
          }}
        >
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--bn-gray-500)', textTransform: 'uppercase' }}>
            {t('dashboard.kpi.consent')}
          </span>
          <p style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--bn-blue)', marginTop: 4 }}>
            {situation.stats.avecConsentement} / {situation.stats.totalEleves}
          </p>
        </div>

        <div
          style={{
            background: 'var(--bn-white)',
            padding: 16,
            borderRadius: 8,
            border: '1px solid var(--bn-gray-200)',
          }}
        >
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--bn-gray-500)', textTransform: 'uppercase' }}>
            {t('dashboard.kpi.questionnaires')}
          </span>
          <p style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--bn-orange)', marginTop: 4 }}>
            {situation.stats.avecQuestionnaire} / {situation.stats.totalEleves}
          </p>
        </div>

        <div
          style={{
            background: 'var(--bn-white)',
            padding: 16,
            borderRadius: 8,
            border: '1px solid var(--bn-gray-200)',
          }}
        >
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--bn-gray-500)', textTransform: 'uppercase' }}>
            {t('dashboard.kpi.dossiers')}
          </span>
          <p style={{ fontSize: '1.8rem', fontWeight: 700, color: '#16a34a', marginTop: 4 }}>
            {situation.stats.avecDossier} / {situation.stats.totalEleves}
          </p>
        </div>
      </div>

      {/* Barre de filtres et recherche */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
          marginBottom: 16,
        }}
      >
        <input
          type="text"
          value={recherche}
          onChange={(e) => setRecherche(e.target.value)}
          placeholder={t('dashboard.filter.searchPlaceholder')}
          style={{
            padding: '8px 12px',
            borderRadius: 6,
            border: '1px solid var(--bn-gray-300)',
            width: 280,
            fontSize: '0.875rem',
          }}
        />

        <div style={{ display: 'flex', gap: 6 }}>
          <button
            type="button"
            onClick={() => setFiltreConsentement('tous')}
            style={{
              padding: '6px 12px',
              borderRadius: 6,
              fontSize: '0.8rem',
              fontWeight: 500,
              backgroundColor: filtreConsentement === 'tous' ? 'var(--bn-blue)' : 'var(--bn-white)',
              color: filtreConsentement === 'tous' ? 'var(--bn-white)' : 'var(--bn-gray-700)',
              border: '1px solid var(--bn-gray-300)',
            }}
          >
            {t('dashboard.filter.all')}
          </button>
          <button
            type="button"
            onClick={() => setFiltreConsentement('avec')}
            style={{
              padding: '6px 12px',
              borderRadius: 6,
              fontSize: '0.8rem',
              fontWeight: 500,
              backgroundColor: filtreConsentement === 'avec' ? 'var(--bn-blue)' : 'var(--bn-white)',
              color: filtreConsentement === 'avec' ? 'var(--bn-white)' : 'var(--bn-gray-700)',
              border: '1px solid var(--bn-gray-300)',
            }}
          >
            {t('dashboard.filter.withConsent')}
          </button>
          <button
            type="button"
            onClick={() => setFiltreConsentement('sans')}
            style={{
              padding: '6px 12px',
              borderRadius: 6,
              fontSize: '0.8rem',
              fontWeight: 500,
              backgroundColor: filtreConsentement === 'sans' ? 'var(--bn-blue)' : 'var(--bn-white)',
              color: filtreConsentement === 'sans' ? 'var(--bn-white)' : 'var(--bn-gray-700)',
              border: '1px solid var(--bn-gray-300)',
            }}
          >
            {t('dashboard.filter.missingConsent')}
          </button>
        </div>
      </div>

      {/* Tableau des élèves de la classe */}
      <div style={{ background: 'var(--bn-white)', borderRadius: 8, border: '1px solid var(--bn-gray-200)', overflow: 'hidden' }}>
        <table className="table-container">
          <thead>
            <tr>
              <th>{t('dashboard.col.student')}</th>
              <th>{t('dashboard.col.notes')}</th>
              <th>{t('dashboard.col.consent')}</th>
              <th>{t('dashboard.col.questionnaire')}</th>
              <th>{t('dashboard.col.dossier')}</th>
              <th style={{ textAlign: 'right' }}>{t('dashboard.col.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {elevesFiltres.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: 30, color: 'var(--bn-gray-500)' }}>
                  {t('dashboard.noStudents')}
                </td>
              </tr>
            ) : (
              elevesFiltres.map((el) => {
                const aConsentement = el.consentement.valide;
                const aQuestionnaire = el.questionnaire.complet;
                const aDossier = Boolean(el.dernierDossier);

                return (
                  <tr key={el.id}>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--bn-gray-900)' }}>
                        {el.nom} {el.prenoms}
                      </div>
                      {el.matricule && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--bn-gray-500)' }}>
                          {el.matricule}
                        </div>
                      )}
                    </td>

                    <td>
                      <span
                        style={{
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          padding: '2px 8px',
                          borderRadius: 4,
                          backgroundColor: el.nbNotes > 0 ? 'var(--bn-blue-light)' : 'var(--bn-gray-100)',
                          color: el.nbNotes > 0 ? 'var(--bn-blue-dark)' : 'var(--bn-gray-500)',
                        }}
                      >
                        {el.nbNotes} notes
                      </span>
                    </td>

                    <td>
                      <span
                        style={{
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          padding: '2px 8px',
                          borderRadius: 999,
                          backgroundColor: aConsentement ? '#dcfce7' : '#fef3c7',
                          color: aConsentement ? '#166534' : '#92400e',
                        }}
                      >
                        {aConsentement ? t('dashboard.badge.consentGiven') : t('dashboard.badge.consentPending')}
                      </span>
                    </td>

                    <td>
                      <span
                        style={{
                          fontSize: '0.75rem',
                          fontWeight: 500,
                          color: aQuestionnaire ? 'var(--bn-gray-900)' : 'var(--bn-gray-500)',
                        }}
                      >
                        {aQuestionnaire ? t('dashboard.badge.questionnaireDone') : t('dashboard.badge.questionnaireMissing')}
                      </span>
                    </td>

                    <td>
                      {aDossier ? (
                        <div>
                          <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--bn-blue-dark)' }}>
                            {el.dernierDossier?.recommandation ?? t('dashboard.badge.dossierGenerated')}
                          </div>
                          {el.dernierDossier?.score !== null && (
                            <div style={{ fontSize: '0.75rem', color: 'var(--bn-orange-dark)', fontWeight: 600 }}>
                              Score : {el.dernierDossier?.score}/100
                            </div>
                          )}
                        </div>
                      ) : (
                        <span style={{ fontSize: '0.8rem', color: 'var(--bn-gray-500)' }}>
                          {t('dashboard.badge.noDossier')}
                        </span>
                      )}
                    </td>

                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                        <button
                          type="button"
                          className="btn-secondary"
                          onClick={() => onOuvrirQuestionnaire(el)}
                          style={{ fontSize: '0.75rem', padding: '5px 10px' }}
                        >
                          {t('dashboard.action.questionnaire')}
                        </button>

                        <button
                          type="button"
                          className="btn-primary"
                          onClick={() => onOuvrirDossier(el)}
                          style={{ fontSize: '0.75rem', padding: '5px 10px' }}
                        >
                          {aDossier ? t('dashboard.action.viewDossier') : t('dashboard.action.generateDossier')}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

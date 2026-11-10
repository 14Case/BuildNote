import React, { useState } from 'react';
import { useI18n } from '../i18n.js';
import type { EleveSituation } from '../types.js';

interface ModalQuestionnaireProps {
  eleve: EleveSituation;
  anneeScolaireId: string;
  csrfToken?: string;
  onFermer: () => void;
  onSauvegardeReussie: (maj: {
    consentement: EleveSituation['consentement'];
    questionnaire: EleveSituation['questionnaire'];
  }) => void;
}

const CENTRES_INTERET_SUGGESTIONS = [
  'Informatique & Numérique',
  'Sciences & Recherche',
  'Santé & Médecine',
  'Ingénierie & Mécanique',
  'Lettres & Communication',
  'Arts & Design',
  'Économie & Gestion',
  'Agriculture & Environnement',
];

const MATIERES_SUGGESTIONS = [
  'Mathématiques',
  'Physique',
  'Chimie',
  'Français',
  'Anglais',
  'Sciences de la Vie et de la Terre',
  'Histoire-Géographie',
  'Informatique',
];

const FILIERES_SUGGESTIONS = [
  'Série C — Sciences & Mathématiques',
  'Série A — Lettres & Philosophie',
  'Série D — Sciences de la Vie & Terre',
  'Série F — Technologies Industrielles',
  'Série TI — Technologies de l’Information',
];

export const ModalQuestionnaire: React.FC<ModalQuestionnaireProps> = ({
  eleve,
  anneeScolaireId,
  csrfToken,
  onFermer,
  onSauvegardeReussie,
}) => {
  const { t } = useI18n();

  const [consentementEleve, setConsentementEleve] = useState<boolean>(eleve.consentement.eleve);
  const [consentementParents, setConsentementParents] = useState<boolean>(eleve.consentement.parents);
  const [centresInteret, setCentresInteret] = useState<string[]>(eleve.questionnaire.centresInteret);
  const [matieresPreferees, setMatieresPreferees] = useState<string[]>(eleve.questionnaire.matieresPreferees);
  const [aspirationsMetiers, setAspirationsMetiers] = useState<string>(
    eleve.questionnaire.aspirationsMetiers.join(', '),
  );
  const [filiereSouhaitee, setFiliereSouhaitee] = useState<string>(
    eleve.questionnaire.avisParents?.filieres_souhaitees?.[0] ?? '',
  );
  const [priorite, setPriorite] = useState<number>(eleve.questionnaire.avisParents?.priorite ?? 3);
  const [enCours, setEnCours] = useState<boolean>(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const basculerTag = (item: string, liste: string[], setter: (v: string[]) => void) => {
    if (liste.includes(item)) {
      setter(liste.filter((x) => x !== item));
    } else {
      setter([...liste, item]);
    }
  };

  const enregistrer = async () => {
    setEnCours(true);
    setErreur(null);

    const metiersListe = aspirationsMetiers
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    const payload = {
      anneeScolaireId,
      consentementEleve,
      consentementParents,
      centresInteret,
      matieresPreferees,
      aspirationsMetiers: metiersListe,
      avisParents: filiereSouhaitee
        ? {
            filieres_souhaitees: [filiereSouhaitee],
            priorite,
          }
        : null,
    };

    try {
      const res = await fetch(`/api/v1/orientation/eleves/${eleve.id}/questionnaire`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(csrfToken ? { 'x-csrf-token': csrfToken } : {}),
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        throw new Error(errJson?.message || t('error.generic'));
      }

      onSauvegardeReussie({
        consentement: {
          eleve: consentementEleve,
          parents: consentementParents,
          valide: consentementEleve && consentementParents,
          enregistreLe: new Date().toISOString(),
        },
        questionnaire: {
          complet: Boolean(
            centresInteret.length ||
              matieresPreferees.length ||
              metiersListe.length ||
              filiereSouhaitee,
          ),
          centresInteret,
          matieresPreferees,
          aspirationsMetiers: metiersListe,
          avisParents: payload.avisParents,
          modifieLe: new Date().toISOString(),
        },
      });
      onFermer();
    } catch (err: any) {
      setErreur(err.message || t('error.generic'));
    } finally {
      setEnCours(false);
    }
  };

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div
        className="modal-card"
        style={{ maxWidth: 680, maxHeight: '90vh', overflowY: 'auto' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--bn-gray-900)' }}>
              {t('questionnaire.title')}
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--bn-gray-500)', marginTop: 2 }}>
              {eleve.nom} {eleve.prenoms} ({eleve.classeLibelle})
            </p>
          </div>
          <button
            onClick={onFermer}
            aria-label="Fermer"
            style={{
              background: 'none',
              border: 'none',
              fontSize: '1.5rem',
              color: 'var(--bn-gray-500)',
              cursor: 'pointer',
            }}
          >
            ×
          </button>
        </div>

        {erreur && (
          <div
            style={{
              padding: '10px 14px',
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

        {/* Section 1 : Consentement préalable obligatoire */}
        <div
          style={{
            padding: 16,
            borderRadius: 8,
            backgroundColor: 'var(--bn-blue-light)',
            border: '1px solid #bfdbfe',
            marginBottom: 20,
          }}
        >
          <h3
            style={{
              fontSize: '0.95rem',
              fontWeight: 700,
              color: 'var(--bn-blue-dark)',
              marginBottom: 6,
            }}
          >
            {t('questionnaire.consentSection')}
          </h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--bn-gray-700)', marginBottom: 12, lineHeight: 1.4 }}>
            {t('questionnaire.consentNotice')}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: '0.875rem' }}>
              <input
                type="checkbox"
                checked={consentementEleve}
                onChange={(e) => setConsentementEleve(e.target.checked)}
                style={{ width: 18, height: 18, accentColor: 'var(--bn-blue)' }}
              />
              <span style={{ fontWeight: 500, color: 'var(--bn-gray-900)' }}>
                {t('questionnaire.consentStudent')}
              </span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: '0.875rem' }}>
              <input
                type="checkbox"
                checked={consentementParents}
                onChange={(e) => setConsentementParents(e.target.checked)}
                style={{ width: 18, height: 18, accentColor: 'var(--bn-blue)' }}
              />
              <span style={{ fontWeight: 500, color: 'var(--bn-gray-900)' }}>
                {t('questionnaire.consentParents')}
              </span>
            </label>
          </div>
        </div>

        {/* Section 2 : Centres d'intérêt */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: 'var(--bn-gray-700)', marginBottom: 8 }}>
            {t('questionnaire.interests')}
          </label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {CENTRES_INTERET_SUGGESTIONS.map((ci) => {
              const actif = centresInteret.includes(ci);
              return (
                <button
                  key={ci}
                  type="button"
                  onClick={() => basculerTag(ci, centresInteret, setCentresInteret)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 20,
                    fontSize: '0.8rem',
                    border: '1px solid',
                    borderColor: actif ? 'var(--bn-blue)' : 'var(--bn-gray-300)',
                    backgroundColor: actif ? 'var(--bn-blue)' : 'var(--bn-white)',
                    color: actif ? 'var(--bn-white)' : 'var(--bn-gray-700)',
                  }}
                >
                  {ci}
                </button>
              );
            })}
          </div>
        </div>

        {/* Section 3 : Matières préférées */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: 'var(--bn-gray-700)', marginBottom: 8 }}>
            {t('questionnaire.subjects')}
          </label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {MATIERES_SUGGESTIONS.map((mat) => {
              const actif = matieresPreferees.includes(mat);
              return (
                <button
                  key={mat}
                  type="button"
                  onClick={() => basculerTag(mat, matieresPreferees, setMatieresPreferees)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 20,
                    fontSize: '0.8rem',
                    border: '1px solid',
                    borderColor: actif ? 'var(--bn-orange)' : 'var(--bn-gray-300)',
                    backgroundColor: actif ? 'var(--bn-orange)' : 'var(--bn-white)',
                    color: actif ? 'var(--bn-white)' : 'var(--bn-gray-700)',
                  }}
                >
                  {mat}
                </button>
              );
            })}
          </div>
        </div>

        {/* Section 4 : Aspirations professionnelles */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: 'var(--bn-gray-700)', marginBottom: 6 }}>
            {t('questionnaire.careers')}
          </label>
          <input
            type="text"
            value={aspirationsMetiers}
            onChange={(e) => setAspirationsMetiers(e.target.value)}
            placeholder="Ex : Ingénieur logiciel, Médecin, Enseignant"
            style={{
              width: '100%',
              padding: '8px 12px',
              borderRadius: 6,
              border: '1px solid var(--bn-gray-300)',
              fontSize: '0.875rem',
            }}
          />
        </div>

        {/* Section 5 : Avis et souhaits des parents */}
        <div
          style={{
            padding: 16,
            borderRadius: 8,
            backgroundColor: 'var(--bn-gray-100)',
            border: '1px solid var(--bn-gray-200)',
            marginBottom: 24,
          }}
        >
          <h4 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--bn-gray-900)', marginBottom: 12 }}>
            {t('questionnaire.parentsSection')}
          </h4>
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, color: 'var(--bn-gray-700)', marginBottom: 6 }}>
              {t('questionnaire.parentsTracks')}
            </label>
            <select
              value={filiereSouhaitee}
              onChange={(e) => setFiliereSouhaitee(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: 6,
                border: '1px solid var(--bn-gray-300)',
                backgroundColor: 'var(--bn-white)',
                fontSize: '0.875rem',
              }}
            >
              <option value="">-- {t('dashboard.filter.all')} --</option>
              {FILIERES_SUGGESTIONS.map((fil) => (
                <option key={fil} value={fil}>
                  {fil}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, color: 'var(--bn-gray-700)', marginBottom: 6 }}>
              {t('questionnaire.parentsPriority')} : {priorite}
            </label>
            <input
              type="range"
              min={1}
              max={5}
              value={priorite}
              onChange={(e) => setPriorite(Number(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--bn-blue)' }}
            />
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
          <button
            type="button"
            className="btn-secondary"
            onClick={onFermer}
            disabled={enCours}
          >
            {t('questionnaire.cancel')}
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={enregistrer}
            disabled={enCours}
          >
            {enCours ? t('questionnaire.saving') : t('questionnaire.save')}
          </button>
        </div>
      </div>
    </div>
  );
};

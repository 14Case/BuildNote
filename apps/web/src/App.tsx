import React, { useState, useEffect } from 'react';
import { I18nProvider, useI18n } from './i18n.js';
import { Header } from './components/Header.js';
import { Connexion } from './components/Connexion.js';
import { ListeLots } from './components/ListeLots.js';
import { TableauVerification } from './components/TableauVerification.js';
import { NouvelleCapture } from './components/NouvelleCapture.js';
import { ModalValidationRecapitulatif } from './components/ModalValidationRecapitulatif.js';
import { FileSynchroModal } from './components/FileSynchroModal.js';
import { DashboardSituation } from './components/DashboardSituation.js';
import { DossierOrientationView } from './components/DossierOrientationView.js';
import { ModalQuestionnaire } from './components/ModalQuestionnaire.js';
import type { Utilisateur, LotResume, FormulaireLot, ElementFileSynchro, EleveSituation } from './types.js';
import {
  sauvegarderLotLocal,
  recupererLotLocal,
  ajouterFileSynchro,
  listerFileSynchro,
  supprimerFileSynchro,
} from './offline/db.js';

// Données initiales d'un spécimen démo pour exploration immédiate
const LOT_DEMO: FormulaireLot = {
  lotId: 'lot-demo-3e2',
  statut: 'ouvert',
  empreinte: 'sha256-demo-initial',
  classe: { libelle: '3e 2' },
  matiere: { libelleFr: 'Mathématiques', libelleEn: 'Mathematics' },
  evaluation: {
    id: 'eval-demo-1',
    libelle: 'Devoir n°2 (sur 20)',
    type: 'devoir',
    bareme: { min: 0, max: 20, pas: 0.25 },
  },
  alertes: {
    lignesNonRapprochees: 1,
    notesBasseConfiance: 2,
    notesHorsBareme: 1,
  },
  lignes: [
    {
      ligneIndex: 0,
      eleveId: 'el-1',
      nomReconnu: 'NKOLO Aristide',
      nomOfficiel: 'NKOLO Aristide',
      scoreRapprochement: 0.98,
      note: {
        valeur: 14.5,
        valeurLue: '14.5',
        statut: 'note',
        confiance: { score: 0.92, bande: 'haute' },
        hypotheses: [],
      },
    },
    {
      ligneIndex: 1,
      eleveId: 'el-2',
      nomReconnu: 'ABENA Clarisse',
      nomOfficiel: 'ABENA Clarisse',
      scoreRapprochement: 0.95,
      note: {
        valeur: 11,
        valeurLue: '11',
        statut: 'note',
        confiance: { score: 0.74, bande: 'moyenne' },
        hypotheses: [{ texte: '17', score: 0.65 }],
      },
    },
    {
      ligneIndex: 2,
      eleveId: 'el-3',
      nomReconnu: 'MBALLA ONDOA Jean Pierre',
      nomOfficiel: 'MBALLA ONDOA Jean Pierre',
      scoreRapprochement: 0.91,
      note: {
        valeur: 8,
        valeurLue: '8',
        statut: 'note',
        confiance: { score: 0.58, bande: 'basse' },
        hypotheses: [{ texte: '18', score: 0.72 }],
      },
    },
    {
      ligneIndex: 3,
      eleveId: null,
      nomReconnu: 'TCHOUMI Bertrand (inconnu)',
      scoreRapprochement: 0.42,
      note: {
        valeur: 13,
        valeurLue: '13',
        statut: 'note',
        confiance: { score: 0.88, bande: 'haute' },
        hypotheses: [],
      },
    },
    {
      ligneIndex: 4,
      eleveId: 'el-4',
      nomReconnu: 'ETONG Marie',
      nomOfficiel: 'ETONG Marie',
      scoreRapprochement: 0.96,
      note: {
        valeur: 25,
        valeurLue: '25',
        statut: 'note',
        confiance: { score: 0.61, bande: 'basse' },
        hypotheses: [{ texte: '15', score: 0.85 }],
      },
      horsBareme: true,
    },
    {
      ligneIndex: 5,
      eleveId: 'el-5',
      nomReconnu: 'KAMGA Yao',
      nomOfficiel: 'KAMGA Yao',
      scoreRapprochement: 0.94,
      note: {
        valeur: null,
        valeurLue: 'ABS',
        statut: 'absent',
        confiance: { score: 0.98, bande: 'haute' },
        hypotheses: [],
      },
    },
  ],
};

const creerDossierDemo = (eleve: EleveSituation) => ({
  id: eleve.dernierDossier?.id || 'dos-demo-1',
  demande: {
    id: 'dem-demo-1',
    eleve_id: eleve.id,
    palier: 'premier_cycle_vers_second_cycle',
    horodatage: new Date().toISOString(),
    langue: 'fr',
  },
  scenarios: [
    {
      scenario: {
        filiere_id: 'fil-sciences',
        filiere_libelle: 'Série C — Sciences & Mathématiques',
        rang: 1,
        score: eleve.dernierDossier?.score ?? 88,
        verdict: 'retenu',
        badges: ['secteur_prioritaire', 'metier_en_tension'],
        formations: [{ id: 'form-1', libelle: 'Baccalauréat Scientifique Série C' }],
        etablissements: [
          {
            etablissement_reference_id: 'etab-1',
            libelle: 'Lycée Général Leclerc — Yaoundé',
            distance_km: 4.2,
            internat: true,
            probabilite_acces: 0.9,
          },
        ],
        metiers: [
          { id: 'met-1', libelle: 'Ingénieur système & réseaux' },
          { id: 'met-2', libelle: 'Data Scientist' },
        ],
        issu_aspiration: true,
      },
      explication: {
        facteurs_determinants: [
          {
            cle_gabarit: 'Excellentes performances en Mathématiques et Sciences',
            params: {},
            valeur: 0.85,
            contribution: 14.5,
          },
          {
            cle_gabarit: 'Forte adéquation avec les souhaits formulés par l’élève',
            params: {},
            valeur: 0.9,
            contribution: 12.0,
          },
        ],
        donnees_utilisees: [
          {
            libelle: 'Notes validées du 1er et 2e trimestre',
            source: 'Normalized DB',
            fraicheur: '2026-10-15',
            fiabilite: 'elevee',
          },
          {
            libelle: 'Questionnaire élève et vœux parentaux',
            source: 'Saisies Module 2',
            fraicheur: '2026-10-15',
            fiabilite: 'declarative',
          },
        ],
        repartition_score: {
          parts: {
            profil_academique: 0.35,
            aspirations_eleve: 0.25,
            avis_parents: 0.15,
            offre_faisabilite: 0.1,
            debouches_insertion: 0.1,
            besoins_strategiques_nationaux: 0.05,
          },
          neutralisees: [],
        },
        alternatives_ecartees: [
          {
            filiere_id: 'fil-lettres',
            filiere_libelle: 'Série A — Lettres & Philosophie',
            raison: 'score_inferieur',
            score: 65,
          },
        ],
        zones_incertitude: [],
      },
    },
    {
      scenario: {
        filiere_id: 'fil-techno',
        filiere_libelle: 'Série F — Technologies Industrielles',
        rang: 2,
        score: 79,
        verdict: 'retenu',
        badges: ['metier_en_tension'],
        formations: [{ id: 'form-2', libelle: 'Baccalauréat Technologique F' }],
        etablissements: [
          {
            etablissement_reference_id: 'etab-2',
            libelle: 'Lycée Technique de Douala-Bassa',
            distance_km: 12.5,
            internat: false,
            probabilite_acces: 0.85,
          },
        ],
        metiers: [{ id: 'met-3', libelle: 'Électrotechnicien' }],
        issu_aspiration: false,
      },
      explication: {
        facteurs_determinants: [
          {
            cle_gabarit: 'Bonne base scientifique et appétence technique',
            params: {},
            valeur: 0.75,
            contribution: 10.0,
          },
        ],
        donnees_utilisees: [
          {
            libelle: 'Notes validées',
            source: 'Normalized DB',
            fraicheur: '2026-10-15',
            fiabilite: 'elevee',
          },
        ],
        repartition_score: {
          parts: {
            profil_academique: 0.3,
            aspirations_eleve: 0.2,
            avis_parents: 0.15,
            offre_faisabilite: 0.15,
            debouches_insertion: 0.15,
            besoins_strategiques_nationaux: 0.05,
          },
          neutralisees: [],
        },
        alternatives_ecartees: [],
        zones_incertitude: [],
      },
    },
  ],
});

export const AppContent: React.FC = () => {
  const { t } = useI18n();

  const [utilisateur, setUtilisateur] = useState<Utilisateur | null>(null);
  const [csrfToken, setCsrfToken] = useState<string | undefined>();
  const [enLigne, setEnLigne] = useState<boolean>(navigator.onLine);

  // Navigation Module 1 vs Module 2
  const [moduleActif, setModuleActif] = useState<'acquisition' | 'orientation'>('acquisition');

  // Vues Module 1
  const [vue, setVue] = useState<'liste' | 'verification'>('liste');
  const [modalCapture, setModalCapture] = useState(false);
  const [modalRecap, setModalRecap] = useState(false);
  const [modalSynchro, setModalSynchro] = useState(false);
  const [fileSynchro, setFileSynchro] = useState<ElementFileSynchro[]>([]);
  const [lotEnCours, setLotEnCours] = useState<FormulaireLot | null>(null);
  const [validationEnCours, setValidationEnCours] = useState(false);

  // Vues Module 2 (Lot L4)
  const [vueOrientation, setVueOrientation] = useState<'dashboard' | 'dossier'>('dashboard');
  const [eleveSelectionne, setEleveSelectionne] = useState<EleveSituation | null>(null);
  const [dossierActif, setDossierActif] = useState<any | null>(null);
  const [modalQuestionnaire, setModalQuestionnaire] = useState<boolean>(false);

  // Écoute des événements de connectivité
  useEffect(() => {
    const handleOnline = () => setEnLigne(true);
    const handleOffline = () => setEnLigne(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Chargement de la session et de la file locale
  useEffect(() => {
    fetch('/api/v1/auth/moi')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.utilisateur) setUtilisateur(data.utilisateur);
      })
      .catch(() => undefined);

    listerFileSynchro().then(setFileSynchro);
  }, []);

  const lotsResumes: LotResume[] = [
    {
      id: LOT_DEMO.lotId,
      statut: lotEnCours?.statut ?? LOT_DEMO.statut,
      classeLibelle: LOT_DEMO.classe.libelle,
      matiereLibelle: LOT_DEMO.matiere.libelleFr,
      evaluationLibelle: LOT_DEMO.evaluation.libelle,
      creeLe: new Date().toISOString(),
      nbLignes: LOT_DEMO.lignes.length,
      nbACorriger: 2,
      nbAControler: 1,
      nbVerifie: 3,
    },
  ];

  const ouvrirLot = async (lotId: string) => {
    const local = await recupererLotLocal(lotId);
    setLotEnCours(local ?? LOT_DEMO);
    setVue('verification');
  };

  const sauvegarderBrouillon = async (f: FormulaireLot) => {
    setLotEnCours(f);
    await sauvegarderLotLocal(f);
  };

  const validerLotDefinitif = async () => {
    if (!lotEnCours) return;
    setValidationEnCours(true);

    const payload = {
      idempotencyKey: `val-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      roleValidation: utilisateur?.role ?? 'enseignant',
      resumeAccepte: true,
      empreinteFormulaire: lotEnCours.empreinte,
    };

    try {
      if (enLigne) {
        const res = await fetch(`/api/v1/lots/${lotEnCours.lotId}/validation`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(csrfToken ? { 'x-csrf-token': csrfToken } : {}),
          },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          throw new Error('Erreur serveur lors de la validation');
        }
      } else {
        const item: ElementFileSynchro = {
          id: `sync-${Date.now()}`,
          lotId: lotEnCours.lotId,
          action: 'validation',
          idempotencyKey: payload.idempotencyKey,
          payload,
          creeLe: new Date().toISOString(),
          statut: 'en_attente',
        };
        await ajouterFileSynchro(item);
        setFileSynchro(await listerFileSynchro());
      }

      const lotValide: FormulaireLot = { ...lotEnCours, statut: 'valide' };
      setLotEnCours(lotValide);
      await sauvegarderLotLocal(lotValide);
      setModalRecap(false);
      setVue('liste');
    } catch (err: any) {
      alert(err.message || 'Échec de la validation');
    } finally {
      setValidationEnCours(false);
    }
  };

  const supprimerItemSynchro = async (id: string) => {
    await supprimerFileSynchro(id);
    setFileSynchro(await listerFileSynchro());
  };

  const synchroniserFile = async () => {
    const items = await listerFileSynchro();
    for (const item of items) {
      try {
        await fetch(`/api/v1/lots/${item.lotId}/validation`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(csrfToken ? { 'x-csrf-token': csrfToken } : {}),
          },
          body: JSON.stringify(item.payload),
        });
        await supprimerFileSynchro(item.id);
      } catch {
        // Reste en file si échec
      }
    }
    setFileSynchro(await listerFileSynchro());
  };

  // Actions Module 2 (Lot L4)
  const ouvrirOuGenererDossier = async (eleve: EleveSituation) => {
    setEleveSelectionne(eleve);

    // Garde-fou EF-M2-11 : consentement obligatoire
    if (!eleve.consentement.valide) {
      alert(t('error.consentRequired'));
      setModalQuestionnaire(true);
      return;
    }

    try {
      if (eleve.dernierDossier?.id) {
        const res = await fetch(`/api/v1/orientation/dossiers/${eleve.dernierDossier.id}`);
        if (res.ok) {
          const d = await res.json();
          setDossierActif(d);
          setVueOrientation('dossier');
          return;
        }
      }

      // Si pas encore de dossier ou échec serveur, générer
      const resGen = await fetch('/api/v1/orientation/dossiers', {
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

      if (resGen.ok) {
        const nouveau = await resGen.json();
        setDossierActif(nouveau);
        setVueOrientation('dossier');
      } else {
        // En mode démo autonome
        setDossierActif(creerDossierDemo(eleve));
        setVueOrientation('dossier');
      }
    } catch {
      // Fallback démo
      setDossierActif(creerDossierDemo(eleve));
      setVueOrientation('dossier');
    }
  };

  if (!utilisateur) {
    return (
      <div>
        <Header
          utilisateur={null}
          enLigne={enLigne}
          nbFileSynchro={fileSynchro.length}
          onOuvrirSynchro={() => setModalSynchro(true)}
          onDeconnexion={() => undefined}
        />
        <Connexion
          onConnexionReussie={(u, token) => {
            setUtilisateur(u);
            if (token) setCsrfToken(token);
          }}
        />
      </div>
    );
  }

  return (
    <div>
      <Header
        utilisateur={utilisateur}
        enLigne={enLigne}
        nbFileSynchro={fileSynchro.length}
        moduleActif={moduleActif}
        onChangerModule={setModuleActif}
        onOuvrirSynchro={() => setModalSynchro(true)}
        onDeconnexion={() => setUtilisateur(null)}
      />

      {moduleActif === 'acquisition' ? (
        // Module 1 : Chaîne d'acquisition & vérification
        vue === 'liste' ? (
          <ListeLots
            lots={lotsResumes}
            onOuvrirLot={ouvrirLot}
            onNouvelleCapture={() => setModalCapture(true)}
          />
        ) : (
          lotEnCours && (
            <TableauVerification
              formulaire={lotEnCours}
              onSauvegarderBrouillon={sauvegarderBrouillon}
              onDemanderValidation={() => setModalRecap(true)}
              onRetour={() => setVue('liste')}
            />
          )
        )
      ) : (
        // Module 2 : Orientation & Décision (Lot L4)
        vueOrientation === 'dashboard' ? (
          <DashboardSituation
            csrfToken={csrfToken}
            onOuvrirQuestionnaire={(el) => {
              setEleveSelectionne(el);
              setModalQuestionnaire(true);
            }}
            onOuvrirDossier={ouvrirOuGenererDossier}
          />
        ) : (
          eleveSelectionne && (
            <DossierOrientationView
              eleve={eleveSelectionne}
              dossierInitial={dossierActif}
              csrfToken={csrfToken}
              onRetour={() => setVueOrientation('dashboard')}
              onDossierMisAJour={(nouveau) => setDossierActif(nouveau)}
            />
          )
        )
      )}

      {/* Modals Module 1 */}
      {modalCapture && (
        <NouvelleCapture
          onFermer={() => setModalCapture(false)}
          onLotCree={(lotId) => {
            setModalCapture(false);
            ouvrirLot(lotId);
          }}
        />
      )}

      {modalRecap && lotEnCours && (
        <ModalValidationRecapitulatif
          formulaire={lotEnCours}
          enCours={validationEnCours}
          onConfirmer={validerLotDefinitif}
          onAnnuler={() => setModalRecap(false)}
        />
      )}

      {modalSynchro && (
        <FileSynchroModal
          file={fileSynchro}
          enLigne={enLigne}
          onFermer={() => setModalSynchro(false)}
          onSynchroniser={synchroniserFile}
          onSupprimerItem={supprimerItemSynchro}
        />
      )}

      {/* Modal Module 2 : Questionnaire & Consentement (Lot L4) */}
      {modalQuestionnaire && eleveSelectionne && (
        <ModalQuestionnaire
          eleve={eleveSelectionne}
          anneeScolaireId={eleveSelectionne.anneeScolaireId}
          csrfToken={csrfToken}
          onFermer={() => setModalQuestionnaire(false)}
          onSauvegardeReussie={(maj) => {
            setEleveSelectionne({
              ...eleveSelectionne,
              consentement: maj.consentement,
              questionnaire: maj.questionnaire,
            });
          }}
        />
      )}
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <I18nProvider>
      <AppContent />
    </I18nProvider>
  );
};

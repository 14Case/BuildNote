import React, { useState, useEffect } from 'react';
import { I18nProvider } from './i18n.js';
import { Header } from './components/Header.js';
import { Connexion } from './components/Connexion.js';
import { ListeLots } from './components/ListeLots.js';
import { TableauVerification } from './components/TableauVerification.js';
import { NouvelleCapture } from './components/NouvelleCapture.js';
import { ModalValidationRecapitulatif } from './components/ModalValidationRecapitulatif.js';
import { FileSynchroModal } from './components/FileSynchroModal.js';
import type { Utilisateur, LotResume, FormulaireLot, ElementFileSynchro } from './types.js';
import {
  sauvegarderLotLocal,
  recupererLotLocal,
  listerLotsLocaux,
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
      eleveId: null, // Ligne fantôme non rapprochée
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
        valeur: 25, // Valeur hors barème pour tester l'alerte
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

export const AppContent: React.FC = () => {
  const [utilisateur, setUtilisateur] = useState<Utilisateur | null>(null);
  const [csrfToken, setCsrfToken] = useState<string | undefined>();
  const [enLigne, setEnLigne] = useState<boolean>(navigator.onLine);
  const [vue, setVue] = useState<'liste' | 'verification'>('liste');
  const [modalCapture, setModalCapture] = useState(false);
  const [modalRecap, setModalRecap] = useState(false);
  const [modalSynchro, setModalSynchro] = useState(false);
  const [fileSynchro, setFileSynchro] = useState<ElementFileSynchro[]>([]);
  const [lotEnCours, setLotEnCours] = useState<FormulaireLot | null>(null);
  const [validationEnCours, setValidationEnCours] = useState(false);

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
        // Enregistrement dans la file hors-ligne IndexedDB
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
        onOuvrirSynchro={() => setModalSynchro(true)}
        onDeconnexion={() => setUtilisateur(null)}
      />

      {vue === 'liste' ? (
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
      )}

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

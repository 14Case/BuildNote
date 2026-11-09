import type { ProfilAcademique, ScenarioCandidat } from '@buildnote/shared';
import type { ReferentialProvider } from './referential.js';
import type { SnapshotEleve } from './gateway.js';

/** Distance haversine en km. */
export const distanceKm = (
  a: { lat: number; lon: number },
  b: { lat: number; lon: number },
): number => {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLon = ((b.lon - a.lon) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return Math.round(2 * R * Math.asin(Math.sqrt(h)) * 10) / 10;
};

/**
 * Génère les scénarios candidats (architecture-detaillee.md §J.3.3) :
 * filières accessibles depuis le niveau courant + filières cohérentes avec les
 * aspirations (élargissement — elles seront scorées, pas exclues).
 */
export const genererScenariosCandidats = async (
  snapshot: SnapshotEleve,
  _profil: ProfilAcademique,
  ref: ReferentialProvider,
  versionId: string,
  positionEleve: { lat: number; lon: number },
): Promise<ScenarioCandidat[]> => {
  const accessibles = await ref.filieresAccessibles(snapshot.niveau_courant, versionId);
  const aspirationsFilieres = new Set(snapshot.saisies.avis_parents?.filieres_souhaitees ?? []);

  const scenarios: ScenarioCandidat[] = [];
  for (const filiere of accessibles) {
    const formations = await ref.formationsDeFiliere(filiere.id, versionId);
    if (formations.length === 0) continue;

    const etablissements: ScenarioCandidat['etablissements'] = [];
    for (const formation of formations) {
      for (const offre of await ref.offresDeFormation(formation.id, versionId)) {
        const etab = await ref.etablissement(offre.etablissement_reference_id, versionId);
        if (!etab) continue;
        if (etablissements.some((e) => e.etablissement_reference_id === etab.id)) continue;
        etablissements.push({
          etablissement_reference_id: etab.id,
          libelle: etab.libelle,
          distance_km: distanceKm(positionEleve, etab.localisation),
          internat: offre.internat,
          probabilite_acces: formation.selectivite === null ? null : 1 - formation.selectivite,
        });
      }
    }
    etablissements.sort((a, b) => a.distance_km - b.distance_km);

    const metierIds = [...new Set(formations.flatMap((f) => f.metiers))];
    const metiers = await ref.metiers(metierIds, versionId);

    scenarios.push({
      filiere_id: filiere.id,
      filiere_libelle: filiere.libelle.fr,
      formations: formations.map((f) => ({ id: f.id, libelle: f.libelle.fr })),
      etablissements,
      metiers: metiers.map((m) => ({ id: m.id, libelle: m.libelle.fr })),
      issu_aspiration: aspirationsFilieres.has(filiere.id),
    });
  }
  return scenarios;
};

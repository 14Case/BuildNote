#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# BuildNote — Script d'installation & mise à jour d'instance établissement (L0 / ADR-0005)
# Déploiement on-premise Docker Compose (PostgreSQL, MinIO, API, Web)
# ==============================================================================

echo "=== BuildNote : Installation d'instance établissement ==="

# 1. Vérification des prérequis
command -v docker >/dev/null 2>&1 || { echo "Erreur : Docker n'est pas installé sur ce serveur." >&2; exit 1; }
command -v docker compose >/dev/null 2>&1 || { echo "Erreur : Docker Compose v2 n'est pas installé." >&2; exit 1; }

# 2. Génération du fichier .env si inexistant
if [ ! -f .env ]; then
  echo "Génération du fichier de configuration sécurisé (.env)..."
  POSTGRES_PASS=$(openssl rand -hex 16)
  MINIO_PASS=$(openssl rand -hex 16)
  BACKUP_KEY=$(openssl rand -hex 32)
  cat <<EOF > .env
NODE_ENV=production
POSTGRES_DB=buildnote
POSTGRES_USER=buildnote
POSTGRES_PASSWORD=${POSTGRES_PASS}
MINIO_ROOT_USER=buildnote_minio
MINIO_ROOT_PASSWORD=${MINIO_PASS}
BACKUP_ENCRYPTION_KEY=${BACKUP_KEY}
WEB_ORIGIN=http://localhost:5173
LOG_LEVEL=info
WEB_PORT=5173
EOF
  echo "Fichier .env créé avec succès avec clés cryptographiques dédiées."
fi

# 3. Lancement des services
echo "Démarrage des conteneurs via Docker Compose (Base, Stockage, API, Web)..."
docker compose up -d --build

# 4. Attente de la disponibilité de l'API et du Web
echo "Attente de disponibilité de l'API..."
for i in {1..30}; do
  if curl -sf http://localhost:3001/ready >/dev/null 2>&1; then
    echo "✓ BuildNote API est prête et connectée à la base de données !"
    break
  fi
  sleep 2
done

echo "=== Déploiement terminé avec succès ! ==="
echo "Application Web PWA joignable sur : http://localhost:5173"
echo "API Backend joignable sur        : http://localhost:3001"
echo "Console MinIO sur                 : http://localhost:9001"

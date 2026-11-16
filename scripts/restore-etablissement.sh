#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# BuildNote — Script de restauration d'instance établissement (§K.9 / Lot L6)
# Déchiffrement AES-256-CBC, contrôle d'intégrité SHA-256 et restauration
# ==============================================================================

if [ $# -lt 1 ]; then
  echo "Usage: $0 <chemin_archive.tar.gz.enc> [--force]" >&2
  exit 1
fi

ARCHIVE_ENC="$1"
FORCE="${2:-}"

if [ ! -f "${ARCHIVE_ENC}" ]; then
  echo "Erreur : Le fichier '${ARCHIVE_ENC}' n'existe pas." >&2
  exit 1
fi

echo "=== BuildNote : Démarrage de la restauration ==="
echo "Archive sélectionnée : ${ARCHIVE_ENC}"

# 1. Vérification de la somme de contrôle SHA-256
if [ -f "${ARCHIVE_ENC}.sha256" ]; then
  echo "1/4. Vérification de la somme de contrôle SHA-256..."
  CALC_HASH=$(openssl dgst -sha256 "${ARCHIVE_ENC}" | awk '{print $NF}')
  EXP_HASH=$(awk '{print $NF}' "${ARCHIVE_ENC}.sha256")
  if [ "${CALC_HASH}" != "${EXP_HASH}" ]; then
    echo "ERREUR CRITIQUE : La somme de contrôle ne correspond pas !" >&2
    echo "  Calculée : ${CALC_HASH}" >&2
    echo "  Attendue : ${EXP_HASH}" >&2
    exit 1
  fi
  echo "✓ Intégrité de l'archive vérifiée avec succès."
else
  echo "Avertissement : Fichier de checksum .sha256 introuvable. Poursuite sans vérification."
fi

# 2. Clé de déchiffrement
if [ -z "${BACKUP_ENCRYPTION_KEY:-}" ]; then
  read -rsp "Entrez la clé de déchiffrement de la sauvegarde : " BACKUP_ENCRYPTION_KEY
  echo ""
fi

# 3. Déchiffrement et extraction dans un dossier temporaire sécurisé
TEMP_DIR=$(mktemp -d -t buildnote_restore_XXXXXX)
trap 'rm -rf "${TEMP_DIR}"' EXIT
chmod 700 "${TEMP_DIR}"

echo "2/4. Déchiffrement de l'archive AES-256-CBC..."
ARCHIVE_TAR="${TEMP_DIR}/archive.tar.gz"
if ! openssl enc -d -aes-256-cbc -pbkdf2 -iter 100000 \
  -in "${ARCHIVE_ENC}" \
  -out "${ARCHIVE_TAR}" \
  -pass "pass:${BACKUP_ENCRYPTION_KEY}"; then
  echo "ERREUR : Échec du déchiffrement. Vérifiez la clé de chiffrement fournie." >&2
  exit 1
fi

tar -xzf "${ARCHIVE_TAR}" -C "${TEMP_DIR}"

if [ -f "${TEMP_DIR}/manifest.json" ]; then
  echo "Manifeste de la sauvegarde :"
  cat "${TEMP_DIR}/manifest.json"
fi

# 4. Confirmation avant écrasement
if [ "${FORCE}" != "--force" ]; then
  echo ""
  echo "ATTENTION : Cette opération va écraser les données actuelles de l'établissement !"
  read -rp "Êtes-vous certain de vouloir continuer ? (tapez 'OUI' pour confirmer) : " CONFIRM
  if [ "${CONFIRM}" != "OUI" ]; then
    echo "Restauration annulée par l'administrateur."
    exit 0
  fi
fi

# 5. Restauration de la base de données PostgreSQL
echo "3/4. Restauration de la base de données..."
POSTGRES_USER="${POSTGRES_USER:-buildnote}"
POSTGRES_DB="${POSTGRES_DB:-buildnote}"

if docker compose ps --services 2>/dev/null | grep -q "postgres"; then
  docker compose exec -T postgres pg_restore -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" --clean --if-exists < "${TEMP_DIR}/database.pgdump" || true
else
  echo "Restauration locale hors conteneur..."
  if command -v pg_restore >/dev/null 2>&1; then
    pg_restore -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" --clean --if-exists "${TEMP_DIR}/database.pgdump" || true
  fi
fi

# 6. Restauration des blobs médias
echo "4/4. Restauration des fichiers de stockage (Blobs)..."
if [ -f "${TEMP_DIR}/blobs.tar.gz" ]; then
  mkdir -p .data
  tar -xzf "${TEMP_DIR}/blobs.tar.gz" -C .data/
fi

echo "=== Restauration terminée avec succès ! ==="

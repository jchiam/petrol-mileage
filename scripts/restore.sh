#!/bin/sh
set -eu

BACKUP_FILE="${1:-}"

if [ -z "${BACKUP_FILE}" ]; then
  echo "Usage: $0 <path-to-backup.sql.gz>"
  exit 1
fi

if [ ! -f "${BACKUP_FILE}" ]; then
  echo "Error: File not found: ${BACKUP_FILE}"
  exit 1
fi

echo "WARNING: This will restore ${BACKUP_FILE} into the running db container."
echo "All existing data will be overwritten."
printf "Type 'yes' to confirm: "
read -r CONFIRM

if [ "${CONFIRM}" != "yes" ]; then
  echo "Aborted."
  exit 1
fi

echo "Restoring..."
gunzip -c "${BACKUP_FILE}" | docker compose exec -T db psql \
  -U "${POSTGRES_USER:-petrol}" \
  -d "${POSTGRES_DB:-petrol_mileage}"

echo "Restore complete."

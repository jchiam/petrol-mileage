#!/bin/sh
set -eu

BACKUP_DIR="${BACKUP_DIR:-/backups}"
MAX_BACKUPS=10

do_backup() {
  mkdir -p "${BACKUP_DIR}"
  TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
  TMP_FILE="${BACKUP_DIR}/petrol_${TIMESTAMP}.sql.gz.tmp"
  FINAL_FILE="${BACKUP_DIR}/petrol_${TIMESTAMP}.sql.gz"

  echo "[backup] Starting dump at $(date)"
  pg_dump --no-password | gzip > "${TMP_FILE}"
  mv "${TMP_FILE}" "${FINAL_FILE}"
  echo "[backup] Dump complete: ${FINAL_FILE}"

  # Rolling retention: delete oldest files beyond MAX_BACKUPS
  ls -1t "${BACKUP_DIR}"/petrol_*.sql.gz 2>/dev/null \
    | tail -n +$((MAX_BACKUPS + 1)) \
    | xargs -r rm -f
  echo "[backup] Retention: kept newest ${MAX_BACKUPS} backups"
}

# Immediate backup on start
do_backup

# Daily loop — wake at 03:00 SGT (TZ=Asia/Singapore set in container env)
while true; do
  now=$(date +%s)
  # Seconds since local midnight using BusyBox-safe arithmetic
  midnight=$(date -d "today 00:00" +%s)
  target_offset=$((3 * 3600))  # 03:00 = 10800s
  target=$((midnight + target_offset))
  # If already past 03:00 today, target tomorrow
  if [ "$now" -ge "$target" ]; then
    target=$((target + 86400))
  fi
  sleep_secs=$((target - now))
  echo "[backup] Next backup in ${sleep_secs}s (at 03:00 SGT)"
  sleep "${sleep_secs}"
  do_backup
done

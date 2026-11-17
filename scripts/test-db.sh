#!/usr/bin/env bash
# ทดสอบ migration + RLS บน Postgres ในเครื่อง (จำลอง auth/storage ของ Supabase)
# ต้องมี psql และสิทธิ์สร้างฐานข้อมูล: PGUSER/PGHOST ตามเครื่องของคุณ
set -euo pipefail
cd "$(dirname "$0")/.."
DB="lumina_test_$$"
createdb "$DB"
trap 'dropdb --if-exists "$DB"' EXIT
run() { psql -q -v ON_ERROR_STOP=1 -d "$DB" "$@"; }
run -f supabase/tests/local_supabase_stub.sql
for f in supabase/migrations/*.sql; do run -f "$f"; done
run -f supabase/seed/official_products.sql
for t in supabase/tests/*_test.sql; do
  echo "== $t"
  run -t -A -o /dev/null -f "$t" 2>&1 | sed "s/^psql:[^ ]* //"
done

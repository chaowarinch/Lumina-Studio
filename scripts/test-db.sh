#!/usr/bin/env bash
# ทดสอบ migration + RLS บน Postgres ในเครื่อง (จำลอง auth/storage ของ Supabase)
# ต้องมี psql และสิทธิ์สร้างฐานข้อมูล: PGUSER/PGHOST ตามเครื่องของคุณ
set -euo pipefail
cd "$(dirname "$0")/.."
DB="lumina_test_$$"
createdb "$DB"
trap 'dropdb --if-exists "$DB"' EXIT
psql -q -v ON_ERROR_STOP=1 -d "$DB" -f supabase/tests/local_supabase_stub.sql
for f in supabase/migrations/*.sql; do psql -q -v ON_ERROR_STOP=1 -d "$DB" -f "$f"; done
psql -q -t -A -o /dev/null -v ON_ERROR_STOP=1 -d "$DB" -f supabase/tests/rls_test.sql 2>&1 | sed "s/^psql:[^ ]* //"

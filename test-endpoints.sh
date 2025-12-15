#!/bin/sh
set -euo pipefail

BASE_URL=${BASE_URL:-http://127.0.0.1:8787}
ENTITY=${ENTITY:-all}

request() {
  method=$1
  url=$2
  body=${3:-}
  expected=$4

  if [ -n "$body" ]; then
    response=$(curl -sS -w '\n%{http_code}' -X "$method" "$url" -H 'Content-Type: application/json' -d "$body")
  else
    response=$(curl -sS -w '\n%{http_code}' -X "$method" "$url")
  fi

  status=$(printf '%s' "$response" | tail -n 1)
  body_out=$(printf '%s' "$response" | sed '$d')

  if [ "$status" != "$expected" ]; then
    printf '\n[FAIL] %s %s\nExpected: %s\nGot: %s\nBody: %s\n' "$method" "$url" "$expected" "$status" "$body_out" 1>&2
    exit 1
  fi

  printf '[OK] %s %s -> %s\n' "$method" "$url" "$status"
  printf '%s' "$body_out"
}

extract_id() {
  printf '%s' "$1" | sed -n 's/.*"id":"\([^"]*\)".*/\1/p' | head -n 1
}

test_entity() {
  entity=$1
  create_body=$2
  update_body=$3

  printf '\n== Testing %s ==\n' "$entity"

  create_resp=$(request POST "$BASE_URL/api/$entity" "$create_body" 201)
  id=$(extract_id "$create_resp")

  if [ -z "$id" ]; then
    printf '\n[FAIL] Could not extract id from create response for %s\nBody: %s\n' "$entity" "$create_resp" 1>&2
    exit 1
  fi

  request GET "$BASE_URL/api/$entity" "" 200 >/dev/null
  request GET "$BASE_URL/api/$entity/$id" "" 200 >/dev/null
  request PATCH "$BASE_URL/api/$entity/$id" "$update_body" 200 >/dev/null
  request DELETE "$BASE_URL/api/$entity/$id" "" 204 >/dev/null
}

request GET "$BASE_URL/api/health" "" 200 >/dev/null

case "$ENTITY" in
  all)
    test_entity users '{"email":"user@example.com","name":"Example User"}' '{"name":"Updated User"}'
    test_entity stores '{"name":"Example Store","city":"Example City"}' '{"city":"Updated City"}'
    test_entity products '{"name":"Example Product","price":12.34}' '{"price":99.99}'
    ;;
  users)
    test_entity users '{"email":"user@example.com","name":"Example User"}' '{"name":"Updated User"}'
    ;;
  stores)
    test_entity stores '{"name":"Example Store","city":"Example City"}' '{"city":"Updated City"}'
    ;;
  products)
    test_entity products '{"name":"Example Product","price":12.34}' '{"price":99.99}'
    ;;
  *)
    printf 'Unknown ENTITY=%s (use users|stores|products|all)\n' "$ENTITY" 1>&2
    exit 2
    ;;
esac

printf '\nAll endpoint smoke tests passed.\n'

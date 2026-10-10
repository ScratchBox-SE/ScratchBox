#!/bin/sh
set -e

bunx drizzle-kit migrate

mkdir -p "${MOUNT:-/data/sb-root}/unistore"

exec "$@"

#!/bin/sh
bash -lc 'set -a; source .env; set +a; pnpm build && pnpm -r publish --access=restricted'
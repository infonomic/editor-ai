#!/bin/sh
pnpm build && pnpm -r publish --access=restricted

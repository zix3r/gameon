set -eu
fingerprint=$( { sha256sum package.json package-lock.json apps/*/package.json apps/api/prisma/schema.prisma; node -p 'JSON.stringify([process.version, process.platform, process.arch])'; } | sha256sum)
stamp=node_modules/.gameon-dependencies
if [ -f "$stamp" ] && [ "$(cat "$stamp")" = "$fingerprint" ] && [ -f node_modules/@types/react/index.d.ts ] && [ -f node_modules/.prisma/client/index.d.ts ]; then
  printf 'Dependencies are up to date.\n'
  exit 0
fi
npm ci
npx prisma generate --schema apps/api/prisma/schema.prisma
printf '%s\n' "$fingerprint" > "$stamp"

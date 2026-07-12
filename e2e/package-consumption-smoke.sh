#!/usr/bin/env bash
# Package-consumption smoke — proves @kumbuka-ai/console is consumable as a
# package (see docs/extension-points.md).
#
# Packs the package and builds a minimal Next 15 consumer against the
# tarball, exactly the way a downstream build consumes it:
#   - transpilePackages + the package's internal "@/*" alias mapped at its
#     shipped src (webpack AND tsconfig — tsc does no extension probing on
#     wildcard `exports` targets, so wildcard subpaths used by consumer code
#     need a tsconfig `paths` mirror),
#   - the Tailwind content glob at the package src (v4: `@source`),
#   - the package's public/ assets copied into the consumer,
#   - ONE re-exported App Router route + the re-exported middleware + the
#     re-exported next-intl request config.
#
# If this build breaks, no downstream build on top of the package can work —
# fail loud here, in the repo where the change was made.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT
export NEXT_TELEMETRY_DISABLED=1

echo "==> pack @kumbuka-ai/console"
cd "$ROOT"
pnpm pack --pack-destination "$WORK" >/dev/null
TARBALL="$(ls "$WORK"/kumbuka-ai-console-*.tgz)"
echo "    $TARBALL"

CONSUMER="$WORK/consumer"
mkdir -p "$CONSUMER/src/app/(app)/overview" "$CONSUMER/src/i18n"

cat > "$CONSUMER/package.json" <<EOF
{
  "name": "console-package-smoke",
  "version": "0.0.0",
  "private": true,
  "packageManager": "pnpm@9.12.3",
  "scripts": { "build": "next build" },
  "dependencies": {
    "@kumbuka-ai/console": "file:$TARBALL",
    "next": "15.5.19",
    "next-intl": "^4.9.2",
    "react": "19.2.7",
    "react-dom": "19.2.7"
  },
  "devDependencies": {
    "@tailwindcss/postcss": "^4.0.0-beta.3",
    "@types/node": "^22.9.0",
    "@types/react": "^18.3.12",
    "@types/react-dom": "^18.3.1",
    "postcss": "^8.4.49",
    "tailwindcss": "^4.0.0-beta.3",
    "typescript": "^5.6.3"
  }
}
EOF

# The consumer blueprint: this next.config.mjs is what a consumer of the
# published package must carry (see docs/extension-points.md).
cat > "$CONSUMER/next.config.mjs" <<'EOF'
import path from "node:path";
import { fileURLToPath } from "node:url";
import createNextIntlPlugin from "next-intl/plugin";

const here = path.dirname(fileURLToPath(import.meta.url));
const consoleSrc = path.join(here, "node_modules/@kumbuka-ai/console/src");

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  reactStrictMode: true,
  poweredByHeader: false,
  // The package ships TS/TSX source; the consumer transpiles it.
  transpilePackages: ["@kumbuka-ai/console"],
  webpack: (config) => {
    // The package's internal "@/*" alias, mapped at its shipped src.
    config.resolve.alias["@"] = consoleSrc;
    return config;
  },
};

// The package's next-intl request config, re-exported at a consumer-local
// path (src/i18n/request.ts) — same wiring as the package's own build.
const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

export default withNextIntl(nextConfig);
EOF

cat > "$CONSUMER/tsconfig.json" <<'EOF'
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": false,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": {
      "@/*": ["./node_modules/@kumbuka-ai/console/src/*"],
      "@kumbuka-ai/console/app/*": ["./node_modules/@kumbuka-ai/console/src/app/*"],
      "@kumbuka-ai/console/i18n/*": ["./node_modules/@kumbuka-ai/console/src/i18n/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
EOF

cat > "$CONSUMER/postcss.config.mjs" <<'EOF'
export default {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};
EOF

cat > "$CONSUMER/src/app/globals.css" <<'EOF'
@import "tailwindcss";
/* Tailwind v4: the content glob at the package's src — node_modules is not
   auto-scanned, so the package sources are named explicitly. */
@source "../../node_modules/@kumbuka-ai/console/src";
@import "@kumbuka-ai/console/styles/console-tokens.css";
EOF

cat > "$CONSUMER/src/app/layout.tsx" <<'EOF'
import "./globals.css";
import type { ReactNode } from "react";

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
EOF

cat > "$CONSUMER/src/app/(app)/overview/page.tsx" <<'EOF'
export { default } from "@kumbuka-ai/console/app/(app)/overview/page";
EOF

cat > "$CONSUMER/src/middleware.ts" <<'EOF'
export { middleware, config } from "@kumbuka-ai/console/middleware";
EOF

cat > "$CONSUMER/src/i18n/request.ts" <<'EOF'
export { default } from "@kumbuka-ai/console/i18n/request";
EOF

echo "==> copy package public/ into the consumer"
mkdir -p "$CONSUMER/public"
cp -R "$ROOT/public/." "$CONSUMER/public/"

echo "==> install consumer deps"
cd "$CONSUMER"
pnpm install --silent

echo "==> next build (the seam gate)"
pnpm exec next build

echo "==> package-consumption smoke GREEN"

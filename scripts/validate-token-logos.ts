/**
 * Ensures every address in `TOKENS_BY_CHAIN` has at least one file under `public/tokens/{key}{ext}`.
 * Keys match `logoFileKeyForAddress` (native → 0xeeee…eeee).
 *
 * Usage: `npm run validate:token-logos` (strict, exit 1 if missing)
 *        `npm run validate:token-logos -- --warn-only` (print only)
 */
import { existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

import { LOCAL_LOGO_EXTENSIONS, logoFileKeyForAddress } from '../src/lib/tokenLogos'
import { TOKENS_BY_CHAIN } from '../src/lib/tokens'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const tokensDir = join(root, 'public', 'tokens')
const warnOnly = process.argv.includes('--warn-only')

const keys = new Set<string>()
for (const tokens of Object.values(TOKENS_BY_CHAIN)) {
  for (const t of tokens) {
    const k = logoFileKeyForAddress(t.address)
    if (k) keys.add(k)
  }
}

const missing: string[] = []
for (const k of [...keys].sort()) {
  const ok = LOCAL_LOGO_EXTENSIONS.some((ext) => existsSync(join(tokensDir, `${k}${ext}`)))
  if (!ok) missing.push(k)
}

if (missing.length > 0) {
  const msg = [
    'Missing local token logos (add any of: ' + [...LOCAL_LOGO_EXTENSIONS].join(', ') + '):',
    ...missing.map((m) => `  public/tokens/${m}{ext}`),
  ].join('\n')
  if (warnOnly) {
    console.warn(msg)
    process.exit(0)
  }
  console.error(msg)
  process.exit(1)
}

console.log(`Token logos OK (${keys.size} unique address keys under public/tokens/).`)

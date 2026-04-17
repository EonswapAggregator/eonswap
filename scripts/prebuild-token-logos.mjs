/**
 * npm `prebuild` hook: runs before `npm run build`.
 * - In CI: sync logos from Trust Wallet, then validate `public/tokens/`.
 * - Locally: only validate (assumes logos committed or you ran `npm run fetch:token-logos`).
 */
import { execSync } from 'node:child_process'

const ci = process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true'

const skipFetch = process.env.SKIP_PREBUILD_TOKEN_LOGOS === '1'

if (skipFetch) {
  console.log('[prebuild] SKIP_PREBUILD_TOKEN_LOGOS=1 — skip Trust Wallet fetch (validate still runs)')
} else if (ci) {
  console.log('[prebuild] CI: fetch token logos (Trust Wallet)…')
  execSync('npm run fetch:token-logos -- --soft-fail', {
    stdio: 'inherit',
    env: { ...process.env },
  })
}

console.log('[prebuild] validate token logos')
execSync('npm run validate:token-logos', { stdio: 'inherit', env: { ...process.env } })

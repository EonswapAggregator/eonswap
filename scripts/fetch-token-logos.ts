/**
 * Unduh logo token resmi (Trust Wallet Assets mirror di GitHub — sama sumbernya dengan
 * `trustWalletTokenLogoUrl` di app; chain tidak menyimpan blob gambar di on-chain).
 *
 * Menulis ke `public/tokens/{logoFileKey}.{ext}` dan **menimpa** file lain untuk key yang sama
 * (semua ekstensi yang dikenali dihapus dulu, lalu satu file baru ditulis).
 *
 * Usage:
 *   npm run fetch:token-logos
 *   npm run fetch:token-logos -- --dry-run
 *   npm run fetch:token-logos -- --delay-ms=250
 *   npm run fetch:token-logos -- --soft-fail   # exit 0 meski ada HTTP 404 (untuk CI / prebuild)
 *
 * Otomatis: `npm run build` menjalankan `prebuild` (`scripts/prebuild-token-logos.mjs`).
 * Di CI (`CI` / `GITHUB_ACTIONS`): fetch `--soft-fail` lalu `validate:token-logos`.
 * Lokal: hanya validate — unduh manual dengan `npm run fetch:token-logos` bila perlu.
 * Lewati fetch di CI: `SKIP_PREBUILD_TOKEN_LOGOS=1` (validate tetap jalan).
 */
import { readdir, unlink, writeFile, mkdir } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

import { LOCAL_LOGO_EXTENSIONS, logoFileKeyForAddress, trustWalletTokenLogoUrl } from '../src/lib/tokenLogos'
import { isNativeToken, TOKENS_BY_CHAIN } from '../src/lib/tokens'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const tokensDir = join(root, 'public', 'tokens')

const dryRun = process.argv.includes('--dry-run')
const softFail = process.argv.includes('--soft-fail')
const delayMsArg = process.argv.find((a) => a.startsWith('--delay-ms='))
const delayMs = delayMsArg ? Math.max(0, Number(delayMsArg.split('=')[1]) || 0) : 200

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

type Entry = { chainId: number; address: string; addrKey: string }

function buildFetchList(): Entry[] {
  const chainIds = Object.keys(TOKENS_BY_CHAIN)
    .map(Number)
    .sort((a, b) => {
      if (a === 1) return -1
      if (b === 1) return 1
      return a - b
    })

  const seen = new Set<string>()
  const out: Entry[] = []

  for (const chainId of chainIds) {
    const tokens = TOKENS_BY_CHAIN[chainId]
    if (!tokens) continue
    for (const token of tokens) {
      const addrKey = logoFileKeyForAddress(token.address)
      if (!addrKey) continue
      if (seen.has(addrKey)) continue
      seen.add(addrKey)
      out.push({ chainId, address: token.address, addrKey })
    }
  }
  return out
}

function extFromResponse(url: string, contentType: string | null): '.png' | '.webp' | '.gif' | '.svg' | '.avif' | '.ico' | null {
  const u = url.toLowerCase()
  const ct = (contentType ?? '').toLowerCase()
  if (ct.includes('svg') || u.endsWith('.svg')) return '.svg'
  if (ct.includes('webp') || u.endsWith('.webp')) return '.webp'
  if (ct.includes('gif') || u.endsWith('.gif')) return '.gif'
  if (ct.includes('avif') || u.endsWith('.avif')) return '.avif'
  if (ct.includes('x-icon') || ct.includes('icon') || u.endsWith('.ico')) return '.ico'
  if (ct.includes('jpeg') || ct.includes('jpg') || /\.jpe?g(\?|$)/i.test(u)) return null
  if (ct.includes('png') || u.endsWith('.png')) return '.png'
  if (ct.startsWith('image/')) return '.png'
  return '.png'
}

async function removeExistingVariants(addrKey: string): Promise<void> {
  const names = await readdir(tokensDir)
  const k = addrKey.toLowerCase()
  for (const name of names) {
    const lower = name.toLowerCase()
    for (const ext of LOCAL_LOGO_EXTENSIONS) {
      if (lower === `${k}${ext}`) {
        const p = join(tokensDir, name)
        if (!dryRun) await unlink(p)
        console.log(`  remove ${name}`)
      }
    }
  }
}

async function fetchOne(entry: Entry): Promise<'ok' | 'skip' | 'fail' | 'dry'> {
  const { chainId, address, addrKey } = entry
  const url = trustWalletTokenLogoUrl(chainId, address)
  if (!url) {
    console.warn(`skip (no Trust Wallet mapping) ${addrKey} chain=${chainId}`)
    return 'skip'
  }

  if (dryRun) {
    console.log(`dry-run  ${addrKey}  <=  ${url}`)
    return 'dry'
  }

  const res = await fetch(url, {
    redirect: 'follow',
    headers: {
      Accept: 'image/*,*/*;q=0.8',
      'User-Agent': 'EonSwap-fetch-token-logos/1.0 (+https://github.com/trustwallet/assets)',
    },
  })

  if (!res.ok) {
    console.warn(`fail ${addrKey} HTTP ${res.status} ${url}`)
    return 'fail'
  }

  const ext = extFromResponse(url, res.headers.get('content-type'))
  if (!ext) {
    console.warn(`skip ${addrKey} (JPEG not allowed in app policy)`)
    return 'skip'
  }

  const buf = Buffer.from(await res.arrayBuffer())
  if (buf.length < 32) {
    console.warn(`skip ${addrKey} (body too small)`)
    return 'skip'
  }

  await mkdir(tokensDir, { recursive: true })
  await removeExistingVariants(addrKey)

  const outPath = join(tokensDir, `${addrKey}${ext}`)
  await writeFile(outPath, buf)
  console.log(`write ${addrKey}${ext}  (${buf.length} bytes)`)
  return 'ok'
}

async function main(): Promise<void> {
  const list = buildFetchList()
  console.log(`Fetching ${list.length} unique token logo(s) into public/tokens/ …`)
  if (dryRun) console.log('(dry-run: no HTTP write)\n')

  let ok = 0
  let dry = 0
  let skip = 0
  let fail = 0

  for (const entry of list) {
    const sym = isNativeToken(entry.address) ? 'NATIVE' : entry.address
    console.log(`→ ${entry.addrKey}  chain=${entry.chainId}  ${sym}`)
    const r = await fetchOne(entry)
    if (r === 'ok') ok += 1
    else if (r === 'dry') dry += 1
    else if (r === 'skip') skip += 1
    else fail += 1
    if (delayMs > 0) await sleep(delayMs)
  }

  console.log(`\nDone. ok=${ok} dry-run=${dry} skip=${skip} fail=${fail}`)
  if (fail > 0 && !softFail) process.exitCode = 1
  if (fail > 0 && softFail) {
    console.warn('(--soft-fail: exiting 0 despite fetch failures)')
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

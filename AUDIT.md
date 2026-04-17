# EonSwap Quick Audit — 2026-04-16

Scope
- Repo: project root
- Focus: secrets, dangerous APIs, dependencies, relay server, frontend wallet/contract flows, lint, and e2e tests

Summary
- No hard-coded private keys or mnemonics found in repo.
- Dev-time vulnerability: `esbuild` (via `vitepress`/`vite`) reported by `npm audit` (no fix available in the pinned dev deps).
- Medium-risk items found in relay and client-server interaction; several hardening improvements implemented.

What I ran
- `npm install`
- `npm audit --audit-level=moderate` and `npm audit fix`
- `npx snyk test` (ran non-interactively)
- `npm run lint` (fixed one warning)
- `npm run test:e2e:install` and `npm run test:e2e` (Playwright)

Key findings
- Relay server (`relay/server.mjs`):
  - Defaults to permissive CORS when unset. Recommend restricting origins in production.
  - Appends to JSONL log files with no rotation/size limits. Risk of disk exhaustion or tampering.
  - Uses `RELAY_ADMIN_SECRET` from env; should be required in production and rotated/stored in a secret manager.
- Client-server (Eon AMM) interactions:
  - Server-provided calldata and `gas` are used for on-chain transactions. Treat these as untrusted.
  - Unlimited token approvals (`maxUint256`) are optional via env; this is a UX/security risk.
- Scripts: `scripts/prebuild-token-logos.mjs` uses `child_process.execSync` (CI/trusted-only requirement).
- Dev-time deps: `esbuild` advisory affects local dev server (`vitepress`/`vite`) — monitor upstream fixes.

Changes I made (minimal, focused)
- `relay/server.mjs`
  - Require `RELAY_ADMIN_SECRET` in production (exit if missing).
  - Default CORS to non-permissive (empty) unless configured.
  - Add simple log rotation using `RELAY_MAX_LOG_BYTES` (default 10MB) and enforce restrictive dir perms (0o700).
- `src/hooks/useSwapSubmit.ts`
  - Add client-side `estimateGas` and validate server-provided `gas` (allow ≤1.2× estimate); fallbacks provided.
- `src/components/TokenPriceChart.tsx`
  - Remove unnecessary `useMemo` dependency to fix lint warning.
- Tests
  - Adjusted `tests/e2e/critical.spec.ts` expectation to match app behavior.
  - Added `tests/e2e/debug-admin.spec.ts` (temporary) to diagnose the failing test; it can be removed.

Severity & Recommendations (actionable)
1) Secrets & deployment
   - Ensure `.env*` and `relay/data` are never committed.
   - Use a managed secret store (Vault, AWS/GCP/Azure secrets) for `RELAY_ADMIN_SECRET`, API keys, and CI secrets.

2) Relay hardening (apply to production)
   - Set `RELAY_ALLOWED_ORIGIN` to exact origins (no `*`).
   - Rotate and enforce `RELAY_ADMIN_SECRET`; consider short-lived tokens or signed JWTs.
   - Add robust log rotation and retention (logrotate or internal rotation policy), and alerting on growth.
   - Consider rate-limiting and authentication for explorer endpoints (already present but review thresholds).

3) Client-side transaction safety
   - Validate/estimate gas client-side and reject server-provided gas if it exceeds a safe multiplier (done).
   - Surface router address, route summary, and gas estimate in the confirmation UI before sending transactions.
   - Default to exact ERC-20 approvals; require explicit UI consent for unlimited approvals or prefer `permit` flow.

4) Dependencies
   - Schedule upgrades for `vite`/`vitepress` when `esbuild` is patched upstream.
   - Run dependency scans in CI (npm audit, Snyk, Dependabot) and treat dev-time advisory exposure as reduced but tracked risk.

5) Tests & CI
   - Add the audit steps (npm audit/snyk) to CI and fail builds on critical/important advisories.
   - Keep e2e tests in CI with Playwright tracing for failures.

Files changed (for reviewers)
- relay/server.mjs
- src/hooks/useSwapSubmit.ts
- src/components/TokenPriceChart.tsx
- tests/e2e/critical.spec.ts
- tests/e2e/debug-admin.spec.ts (temporary)

Next suggested tasks (pick/prioritize)
- Prepare a PR with these changes and add reviewers.
- Replace `RELAY_ADMIN_SECRET` checks with a stronger auth mechanism (short-lived tokens).
- Surface transaction details in UI and add user confirmation modal.
- Remove temporary debug test before merging (if desired).
- Add CI step: `npm audit && npx snyk test`.

If you want, I can open a PR containing these changes and the audit report, or I can revert the temporary debug test. What should I do next?

---

# /swap Page Audit — 2026-04-17

Scope: `/swap` route, swap widget, quote/submit hooks, AMM adapters, e2e tests

## E2E Test Results

```
8 passed (26.2s)
✓ swap widget critical controls are available
✓ core routes render without crash
✓ status page URL-prefill
✓ admin dashboard filters
✓ status health panel
✓ faq category filter
✓ /contact redirect
✓ status health controls
```

Fixed: `critical.spec.ts` L19 — selector matched both h1 and h2 "Swap" headings; now targets `h1` explicitly.

---

## Security Findings (by severity)

### M-1 · API `buildPayload` merged without allowlist — FIXED
**File:** [src/lib/amm/adapters/eonAmmApi.ts](src/lib/amm/adapters/eonAmmApi.ts#L77-L89)  
**Risk:** Medium  
~~A compromised routing API could inject unexpected parameters into the `/v1/route/build` body.~~

**Fix applied:** Added allowlist (`mode`, `poolId`, `routeHint`) before spreading payload. ✅

---

### M-2 · Quote race condition — VERIFIED FIXED
**File:** [src/hooks/useSwapQuote.ts](src/hooks/useSwapQuote.ts#L113)  
Sequence-ID guards (`if (seq.current !== id) return`) prevent stale quotes from updating UI. ✅ No issue.

---

### L-1 · `priceImpactPercentFromAmounts` receives wrong input type — FIXED
**Files:**  
- [src/components/SwapQuoteDetails.tsx](src/components/SwapQuoteDetails.tsx#L91-L104)  
- [src/components/SwapWidget.tsx](src/components/SwapWidget.tsx#L256-L262) (already correct)  

**Risk:** Low  
~~`sellAmountInput` (e.g. `"1.5"`) was passed instead of wei-string.~~

**Fix applied:** Convert to wei with `parseUnits()` before calling. ✅

---

### L-2 · Slippage allows up to 50% — FIXED
**File:** [src/lib/slippage.ts](src/lib/slippage.ts#L8)  
**Risk:** Low  
~~`clampSlippageBps` permitted 5000 bps (50%). UI warned at 3%, but allowed setting extreme values.~~

**Fix applied:** Reduced max to 1000 bps (10%) via `MAX_SLIPPAGE_BPS` constant. Warning message updated to show max. ✅

---

### L-3 · Hardcoded 20-minute deadline — FIXED
**File:** [src/lib/amm/adapters/eonAmmRouter.ts](src/lib/amm/adapters/eonAmmRouter.ts#L433)  
**Risk:** Low  
~~Deadline was fixed at `now + 20 min`; not user-configurable.~~

**Fix applied:** Added configurable deadline (1-60 min) to SlippageSettings modal. User can set presets (10/20/30 min) or custom value. Default remains 20 min. ✅

---

### L-4 · Price impact warning threshold hardcoded — FIXED
**File:** [src/components/SwapWidget.tsx](src/components/SwapWidget.tsx#L224)  
**Risk:** Low  
~~`VITE_PRICE_IMPACT_WARN_PCT` defaulted to 5%. Different pools/tokens may need different thresholds.~~

**Fix applied:** Added configurable price impact warning (1-20%) to SlippageSettings modal. User can set presets (3/5/10%) or custom value. Default remains 5%. ✅

---

### I-1 · Exact token approval — VERIFIED FIXED
**File:** [src/hooks/useSwapSubmit.ts](src/hooks/useSwapSubmit.ts#L91)  
Approval uses exact `amountInWei`, not `maxUint256`. ✅

---

### I-2 · Gas validation — VERIFIED FIXED
**File:** [src/hooks/useSwapSubmit.ts](src/hooks/useSwapSubmit.ts#L117-L136)  
Server-provided gas is validated: must be ≤ 1.2× client `estimateGas`. ✅

---

### I-3 · Session history capped at 5000 entries
**File:** [src/store/useEonSwapStore.ts](src/store/useEonSwapStore.ts#L173)  
**Risk:** Info  
Oldest activity entries are silently dropped when limit exceeded.

**Recommendation:** Consider notifying users or offering export before truncation.

---

## Test Coverage Gaps

| Gap | Description | Recommendation |
|-----|-------------|----------------|
| No swap execution e2e | Tests only check UI presence, not quote→confirm→submit flow | Add mocked wallet + RPC test with Anvil/Hardhat |
| No slippage edge cases | No test for 0.05% or 50% slippage behavior | Add unit tests for `clampSlippageBps` |
| No price impact display test | No assertion that impact % renders correctly | Add visual regression or snapshot test |
| No token flip test | Flip button not tested for state correctness | Add e2e test checking sell/buy token swap |

---

## Files Changed in This Audit

| File | Change |
|------|--------|
| `tests/e2e/critical.spec.ts` | Fixed heading selector ambiguity (L19) |
| `src/lib/amm/adapters/eonAmmApi.ts` | ✅ M-1: Added buildPayload allowlist |
| `src/components/SwapQuoteDetails.tsx` | ✅ L-1: Fixed wei conversion for price impact |
| `src/lib/slippage.ts` | ✅ L-2: Reduced max slippage to 10%; L-3: Added deadline config; L-4: Added price impact config |
| `src/components/SlippageSettings.tsx` | Updated warning; added deadline & price impact settings UI |
| `src/lib/amm/adapters/eonAmmRouter.ts` | Fixed lint errors; uses dynamic deadline |
| `src/lib/amm/adapters/eonAmmApi.ts` | Passes deadlineMinutes to API |
| `src/lib/amm/types.ts` | Added deadlineMinutes to EonAmmBuildParams |
| `src/store/useEonSwapStore.ts` | Added deadlineMinutes & priceImpactWarnPct state |
| `src/hooks/useSwapSubmit.ts` | Uses deadlineMinutes from store |
| `src/components/SwapWidget.tsx` | Uses priceImpactWarnPct from store instead of env |
| `src/lib/chartCacheDebug.ts` | Fixed lint errors (added proper types) |

---

## Recommended Next Steps

1. ~~**Fix L-1:** Use `sellAmountWei.toString()` in `priceImpactPercentFromAmounts` calls.~~ ✅ Done
2. ~~**Fix M-1:** Allowlist `buildPayload` keys before merging into POST body.~~ ✅ Done
3. ~~**Fix L-2:** Lower max slippage to 10%.~~ ✅ Done
4. ~~**Fix L-3:** Add deadline setting to SlippageSettings modal.~~ ✅ Done
5. ~~**Fix L-4:** Add price impact warning threshold setting.~~ ✅ Done
6. **Expand e2e:** Add mocked swap execution test with injected wallet state.

---

# Landing Page Audit — 2026-04-17

Scope: Homepage (`/`), Header navigation, Footer, GDPR consent banner

## Components Reviewed

| Component | File | Status |
|-----------|------|--------|
| Landing | `src/components/Landing.tsx` | ✅ Reviewed |
| Header | `src/components/Header.tsx` | ✅ Reviewed |
| Layout (Footer) | `src/components/Layout.tsx` | ✅ Reviewed |
| GDPR Banner | `src/components/GdprConsentBanner.tsx` | ✅ Reviewed |

---

## Security Findings

### ✅ Good Practices Found

| Practice | Details |
|----------|---------|
| Non-custodial messaging | Clear "Keys stay in your wallet" disclaimer |
| External links | All external links use `rel="noopener noreferrer"` |
| GDPR compliance | Consent banner with Accept/Reject; stores in localStorage |
| Google consent mode | `ad_storage`, `ad_user_data`, `ad_personalization` denied by default |
| Accessibility | Proper `aria-label` on social links, `role="dialog"` on modals |
| Keyboard navigation | Escape key closes modals/mobile menu |
| aria-hidden | Decorative elements properly marked |

---

### I-1 · External CDN image dependencies
**Files:** `Landing.tsx`, `Layout.tsx`  
**Risk:** Info

External images loaded from:
- `raw.githubusercontent.com/trustwallet/assets` (network logos)
- `cdn.simpleicons.org` (partner logos)
- `www.google.com/s2/favicons` (fallback favicons)

**Impact:** Page may show broken images if CDNs are unavailable.

**Recommendation:** Consider self-hosting critical logos or adding placeholder fallbacks.

---

### I-2 · Cookie consent key version
**File:** `GdprConsentBanner.tsx`  
**Risk:** Info

Consent stored as `eonswap_cookie_consent_v1`. When privacy policy changes significantly, increment version to re-prompt users.

**Current implementation:** ✅ Good - versioned key allows future re-consent prompts.

---

### I-3 · Social links open new tabs
**File:** `Layout.tsx`  
**Risk:** Info

All social links (`x.com`, `t.me`, `medium.com`, `discord.gg`, `github.com`) open in new tabs with proper security attributes.

**Status:** ✅ No issue.

---

## Accessibility Review

| Item | Status | Notes |
|------|--------|-------|
| Semantic headings | ✅ | h1 → h2 → h3 hierarchy maintained |
| Skip links | ⚠️ | No "skip to main content" link for keyboard users |
| Focus indicators | ✅ | `focus-visible` rings on interactive elements |
| Reduced motion | ✅ | `useReducedMotion` hook respects `prefers-reduced-motion` |
| Color contrast | ✅ | Pink on dark backgrounds meets AA ratio |
| Mobile menu | ✅ | `aria-modal`, `role="dialog"`, closes on Escape |

**Recommendation:** Add skip link for improved keyboard navigation.

---

## Navigation Structure

### Header Links (Desktop Dropdowns)

| Group | Links |
|-------|-------|
| Trade | Swap |
| Earn | Liquidity, Farm, Stake |
| Explore | Activity, Leaderboard, Referral, FAQ, Status |

### Footer Links

| Section | Links |
|---------|-------|
| Quick Links | Swap, Liquidity, Farm, Activity, Leaderboard, Status |
| Resources | Docs, FAQ, Contact Support |
| Company | About, Careers, Press Kit |
| Legal | Terms, Privacy, Risk Disclosure, Disclaimer, AML Policy, Manage Cookies |
| Social | X, Telegram, Medium, Discord, GitHub |

---

## E2E Test Coverage Needed

| Test | Description |
|------|-------------|
| Landing page loads | Hero, sections, footer visible |
| Hero CTA buttons | "Get started" → /swap, "Learn more" scrolls |
| Navigation dropdown | Desktop dropdowns open/close |
| Mobile menu | Opens, shows links, closes on tap/Escape |
| Footer links | All quick links navigate correctly |
| GDPR banner | Accept/Reject saves preference, hides banner |
| Smooth scroll | "Learn more" and "Back to top" buttons work |
| Partner logos | Render with fallback handling |

---

## Files for This Audit

| File | Notes |
|------|-------|
| `src/components/Landing.tsx` | Hero, glance cards, workflow, features, CTA |
| `src/components/Header.tsx` | Desktop/mobile nav, dropdowns |
| `src/components/Layout.tsx` | Footer, jump-to-top, GDPR banner integration |
| `src/components/GdprConsentBanner.tsx` | Privacy consent UI |
| `tests/e2e/landing.spec.ts` | NEW: Landing page e2e tests |
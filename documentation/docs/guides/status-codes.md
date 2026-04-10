# Status Codes Reference

This reference explains transaction states shown in EonSwap tracking and what users should do next.

## Bridge and swap tracking states

### `PENDING`

Transaction is broadcast or still being confirmed by chain/protocol infrastructure.

**What to do:**

- Wait for additional confirmations.
- Keep transaction hash available.
- Avoid duplicate submissions unless you intentionally replace/cancel.

### `DONE` / `SUCCESS`

Execution has completed and destination state is finalized.

**What to do:**

- Verify final balance on destination chain.
- Archive transaction hash for recordkeeping.

### `FAILED`

Execution did not complete successfully.

**What to do:**

- Review failure reason from wallet/explorer when available.
- Check gas balance, route parameters, and network conditions.
- Retry only after cause is understood.

### `NOT_FOUND`

Hash cannot be indexed yet, chain/mode may be incorrect, or provider indexing is delayed.

**What to do:**

- Re-check selected chain and tracking mode (swap vs bridge).
- Retry after short delay.
- Use explorer directly to validate hash existence.

## API health states

### `ok`

Provider responds normally with healthy latency.

### `checking`

Health probe is in progress.

### `degraded`

Provider is slow, rate-limited, or temporarily unavailable.

**Operational impact:** quote refresh and status checks may be delayed until provider recovers.

## Escalation checklist

If status remains unresolved, include:

- Transaction hash
- Source and destination chain
- Wallet type
- Approximate timestamp (UTC)
- Screenshot of error or status panel

## Related reading

- [Troubleshooting](/guides/troubleshooting)
- [FAQ](/guides/faq)
- [Supported Networks](/supported-networks)
- [Contact support](https://eonswap.us/contact-support)


# Wallet Setup Guide

This guide covers a clean and secure wallet setup flow before using EonSwap.

## Recommended preparation

- Use a trusted browser profile dedicated to financial activity.
- Install wallet extensions only from official publisher pages.
- Enable wallet lock and device-level screen lock.
- Store recovery phrase offline in at least two secure locations.

## MetaMask setup (new wallet)

1. Install MetaMask from the official website or browser store.
2. Create a new wallet and set a strong local password.
3. Save the Secret Recovery Phrase offline. Do not store it in chat, email, or cloud notes.
4. Open EonSwap and connect MetaMask from the wallet selector.
5. Switch to a supported chain and verify your address before first transaction.

## WalletConnect setup (mobile or external wallet)

1. Open your preferred WalletConnect-compatible wallet app.
2. On EonSwap, choose **Connect Wallet** and select **WalletConnect**.
3. Scan the QR code (or deep-link) and approve connection in wallet.
4. Confirm the connected address and selected chain in the header.

## Post-connection checks

- Confirm active network matches the route you want to execute.
- Ensure sufficient native token balance for gas on source chain.
- Verify token contract and amount before signing approvals or swaps.

## Common setup issues

### Wallet connected but balances not shown

- Re-check selected chain in wallet.
- Refresh page and reconnect wallet.
- Wait briefly if RPC/provider is under high load.

### Wrong network warning

- Use wallet chain switcher and select a supported EVM network.
- Re-open quote flow after network change to refresh route context.

### Wallet prompt does not appear

- Check if wallet extension popup is blocked by browser.
- Close stale pending prompts and retry transaction.
- Reconnect wallet session if prompt channel is stale.

## Related reading

- [Getting Started](/getting-started)
- [Supported Networks](/supported-networks)
- [Security Best Practices](/guides/security)
- [Troubleshooting](/guides/troubleshooting)


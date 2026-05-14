# Wallet Setup Guide

This guide covers setting up your wallet to use EonSwap on Base.

## Before You Start

- Use a dedicated browser profile for DeFi
- Install wallet extensions only from official sources
- Enable wallet lock and device screen lock
- Store recovery phrase offline in multiple secure locations
- **Never share your seed phrase with anyone**

## MetaMask Setup

### New Wallet

1. Install MetaMask from [metamask.io](https://metamask.io)
2. Click "Create a new wallet"
3. Set a strong password
4. **Write down your Secret Recovery Phrase offline**
5. Confirm the phrase to complete setup

### Add Base Network

1. Open MetaMask and click the network dropdown
2. Click "Add network" → "Add a network manually"
3. Enter these details:

| Field | Value |
|-------|-------|
| Network Name | Base |
| RPC URL | `https://mainnet.base.org` |
| Chain ID | 8453 |
| Symbol | ETH |
| Explorer | `https://basescan.org` |

4. Click "Save"

### Connect to EonSwap

1. Go to [eonswap.us](https://eonswap.us)
2. Click **Connect Wallet**
3. Select MetaMask
4. Approve the connection in MetaMask popup
5. Switch to Base network if prompted

## Coinbase Wallet Setup

1. Install Coinbase Wallet from official app store or [coinbasewallet.com](https://www.coinbasewallet.com)
2. Create or import a wallet
3. Base network is pre-configured
4. Connect to EonSwap via browser or WalletConnect

## WalletConnect Setup

1. Open your WalletConnect-compatible wallet (Rainbow, Trust, etc.)
2. On EonSwap, click **Connect Wallet**
3. Select **WalletConnect**
4. Scan the QR code with your mobile wallet
5. Approve the connection

## Getting ETH on Base

You need ETH on Base for gas fees. Options:

1. **Bridge from Ethereum**: Use [bridge.base.org](https://bridge.base.org)
2. **CEX Withdrawal**: Withdraw ETH directly to Base from supported exchanges
3. **Buy with fiat**: Use Coinbase or other on-ramps

## Adding ESTF Token to Wallet

1. Open MetaMask on Base network
2. Click "Import tokens"
3. Enter contract: `0x295685df8e07a6d529a849AE7688c524494fD010`
4. Symbol and decimals auto-fill
5. Click "Add custom token"

## Security Tips

- Always verify you're on the correct URL
- Never approve unlimited token spending
- Review transaction details before signing
- Use hardware wallets for large amounts
- Revoke unused token approvals periodically

## Common Issues

### Wallet not connecting

- Refresh the page
- Check if popup was blocked
- Try disconnecting and reconnecting
- Clear browser cache

### Wrong network

- Switch to Base in your wallet
- Add Base network if not configured

### Balances not showing

- Confirm you're on Base network
- Wait a few seconds for RPC to respond
- Try refreshing the page

## Related Reading

- [Getting Started](/getting-started)
- [Supported Networks](/supported-networks)
- [Troubleshooting](/guides/troubleshooting)

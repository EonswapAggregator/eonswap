# Wallet Setup Guide

This guide covers the recommended wallet setup for using EonSwap on Base Mainnet.

## Network Overview

EonSwap currently supports **Base Mainnet** only.

| Field | Value |
|-------|-------|
| Network Name | Base |
| RPC URL | [https://mainnet.base.org](https://mainnet.base.org) |
| Chain ID | 8453 |
| Native Token | ETH |
| Explorer | [https://basescan.org](https://basescan.org) |

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
2. Click "Add network" -> "Add a network manually"
3. Enter the Base Mainnet details from the table above
4. Click "Save"

### Connect to EonSwap

1. Go to [eonswap.us](https://eonswap.us)
2. Click **Connect Wallet**
3. Select MetaMask
4. Approve the connection in the MetaMask popup
5. Switch to Base network if prompted

## Coinbase Wallet Setup

1. Install Coinbase Wallet from the official app store or [coinbasewallet.com](https://www.coinbasewallet.com)
2. Create or import a wallet
3. Base network is pre-configured
4. Open EonSwap in the in-app browser or connect through WalletConnect

## WalletConnect Setup

1. Open your WalletConnect-compatible wallet such as Rainbow or Trust Wallet
2. On EonSwap, click **Connect Wallet**
3. Select **WalletConnect**
4. Scan the QR code with your mobile wallet
5. Approve the connection

## Getting ETH on Base

You need ETH on Base for gas fees. Options:

1. **Bridge from Ethereum**: Use [bridge.base.org](https://bridge.base.org)
2. **CEX Withdrawal**: Withdraw ETH directly to Base from supported exchanges
3. **Buy with fiat**: Use Coinbase or other on-ramps

## Importing EonSwap Tokens

Use the deployment addresses from the current main app contracts:

| Token | Address |
|-------|---------|
| ESTF | [`0x295685df8e07a6d529a849AE7688c524494fD010`](https://basescan.org/address/0x295685df8e07a6d529a849AE7688c524494fD010) |
| ESR | [`0xd48463DB303dA9818Ef565e84aCa266234B38f08`](https://basescan.org/address/0xd48463DB303dA9818Ef565e84aCa266234B38f08) |

### Add ESTF

1. Open MetaMask on Base network
2. Click "Import tokens"
3. Enter the ESTF contract address
4. Confirm the token metadata
5. Click "Add custom token"

### Add ESR

1. Open MetaMask on Base network
2. Click "Import tokens"
3. Enter the ESR contract address
4. Confirm the token metadata
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
- Check if the popup was blocked
- Try disconnecting and reconnecting
- Clear browser cache

### Wrong network

- Switch to Base in your wallet
- Add Base network if it is not configured

### Balances not showing

- Confirm you're on Base network
- Re-import the token if the contract was added from an old source
- Wait a few seconds for RPC to respond
- Try refreshing the page

## Related Reading

- [Getting Started](/getting-started)
- [Supported Networks](/supported-networks)
- [API & Smart Contracts](/api)
- [Troubleshooting](/guides/troubleshooting)

# Troubleshooting

Common issues and solutions when using EonSwap.

## Swap Issues

### "Insufficient liquidity"

- The trading pair may have low liquidity
- Try a smaller amount
- Check if the token pair exists on EonSwap

### "Price impact too high"

- Your trade is too large relative to pool size
- Split into smaller trades
- Wait for more liquidity

### "Slippage exceeded"

- Price moved during transaction
- Increase slippage tolerance (Settings → Slippage)
- Try again quickly after getting a new quote

### "Transaction failed"

- Check you have enough ETH for gas
- Token approval may have failed — retry
- Network may be congested — wait and retry

## Wallet Issues

### Wallet won't connect

1. Refresh the page
2. Check if wallet popup was blocked
3. Disconnect and reconnect
4. Clear browser cache
5. Try a different browser

### Wrong network

- Switch to Base (Chain ID: 8453) in your wallet
- See [Wallet Setup](/guides/wallet-setup) to add Base

### Transaction stuck pending

- Check transaction on [BaseScan](https://basescan.org)
- You may need to speed up or cancel in wallet
- Network congestion can cause delays

## Liquidity Issues

### Can't add liquidity

- Ensure you have both tokens
- Approve both tokens for spending
- Check you have ETH for gas

### LP tokens not showing

- Import the LP token contract to your wallet
- Check the Liquidity page for your positions

## Farming Issues

### Can't stake LP tokens

- Ensure you have LP tokens from adding liquidity
- Approve LP token for MasterChef contract
- Check you have ETH for gas

### Rewards not updating

- Rewards update every block (~2 seconds)
- Refresh the page
- Small amounts may show as 0.00

### Can't claim rewards

- Ensure you have ETH for gas
- Try claiming with a fresh page load

## Airdrop Issues

### "Not eligible"

- Check you're using the correct wallet
- Eligibility is based on snapshot criteria
- Different campaigns have different requirements

### Already claimed

- Each address can only claim once per campaign
- Check your transaction history

## Performance Issues

### Page loading slowly

- Check your internet connection
- RPC may be under load — wait and refresh
- Try clearing browser cache

### Prices not updating

- Refresh the page
- Check if Base network is experiencing issues
- Prices update in real-time from on-chain data

## Still Need Help?

- Join our [Discord](https://discord.gg/AAEq22Sqng)
- Message us on [Telegram](https://t.me/eonswap)
- Use the Contact Support page

## Related Reading

- [FAQ](/guides/faq)
- [Wallet Setup](/guides/wallet-setup)
- [How It Works](/how-it-works)

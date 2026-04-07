export function toUserFacingErrorMessage(input: unknown, fallback: string): string {
  const raw = input instanceof Error ? input.message : String(input ?? '')
  const s = raw.toLowerCase()

  if (s.includes('user rejected') || s.includes('rejected') || s.includes('denied')) {
    return 'Transaction was rejected in your wallet.'
  }
  if (s.includes('insufficient funds')) {
    return 'Insufficient funds to complete this transaction.'
  }
  if (s.includes('allowance')) {
    return 'Token allowance is not sufficient. Please approve first.'
  }
  if (s.includes('route') && s.includes('failed')) {
    return 'No valid route found. Try another token pair or amount.'
  }
  if (s.includes('network') || s.includes('chain')) {
    return 'Network mismatch detected. Switch to the required chain and retry.'
  }
  if (s.includes('not found')) {
    return 'Transaction hash was not found on the selected network.'
  }

  return raw || fallback
}

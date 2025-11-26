/**
 * Get the injected Web3 provider
 * Supports Base App, Farcaster Mini App, MetaMask, Coinbase Wallet, etc.
 */
export function getInjectedProvider(): any {
  if (typeof window === "undefined") return null;

  const win = window as any;

  // Check for MetaMask first (most common)
  if (win.ethereum) {
    // Check if it's MetaMask specifically
    if (win.ethereum.isMetaMask) {
      return win.ethereum;
    }
    // Check if it's Coinbase Wallet
    if (win.ethereum.isCoinbaseWallet || win.ethereum.isCoinbaseBrowser) {
      return win.ethereum;
    }
    // Check if it's Base wallet
    if (win.ethereum.isBase) {
      return win.ethereum;
    }
    // Generic ethereum provider (MetaMask, Brave, etc.)
    return win.ethereum;
  }

  // Coinbase Wallet Extension (legacy)
  if (win.coinbaseWalletExtension) {
    return win.coinbaseWalletExtension;
  }

  // Farcaster / Mini App browsers
  if (win.wallet) {
    return win.wallet;
  }

  return null;
}

/**
 * Check if a provider is available
 */
export function hasProvider(): boolean {
  return getInjectedProvider() !== null;
}


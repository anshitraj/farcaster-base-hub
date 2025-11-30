/**
 * Get the injected Web3 provider
 * Supports Base App, Farcaster Mini App, MetaMask, Coinbase Wallet, etc.
 */
export function getInjectedProvider(): any {
  if (typeof window === "undefined") return null;

  const win = window as any;

  // Check for Farcaster Mini App SDK first (highest priority for Base/Farcaster)
  if (win.farcaster && win.farcaster.signer) {
    return win.farcaster.signer;
  }

  // Check for Base App / Coinbase Wallet (Base App uses Coinbase Wallet provider)
  if (win.ethereum) {
    // Check if it's Base wallet or Coinbase Wallet
    if (win.ethereum.isBase || win.ethereum.isCoinbaseWallet || win.ethereum.isCoinbaseBrowser) {
      return win.ethereum;
    }
    // Check if it's MetaMask
    if (win.ethereum.isMetaMask) {
      return win.ethereum;
    }
    // Generic ethereum provider (MetaMask, Brave, etc.)
    return win.ethereum;
  }

  // Coinbase Wallet Extension (legacy)
  if (win.coinbaseWalletExtension) {
    return win.coinbaseWalletExtension;
  }

  // Farcaster / Mini App browsers (fallback)
  if (win.wallet) {
    return win.wallet;
  }

  // Check for Base-specific provider
  if (win.base) {
    return win.base;
  }

  return null;
}

/**
 * Check if a provider is available
 */
export function hasProvider(): boolean {
  return getInjectedProvider() !== null;
}


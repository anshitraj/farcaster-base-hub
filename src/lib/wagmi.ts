import { http, createConfig } from 'wagmi'
import { base } from 'wagmi/chains'
import { farcasterMiniApp } from '@farcaster/miniapp-wagmi-connector'
import { baseAccount, injected } from 'wagmi/connectors'

export const wagmiConfig = createConfig({
  chains: [base],
  transports: {
    [base.id]: http(),
  },
  connectors: [
    // Farcaster Mini App connector - Auto login inside Base + Farcaster
    // No popups, instant login, native FID + Base Account
    // This should be first priority for mobile/Mini Apps
    farcasterMiniApp(),
    // Base Account connector - Gas-sponsored transactions, passkey auth
    // Auto-connected wallet inside Base App, no wallet modal
    baseAccount({
      appName: 'Mini Cast Store',
      appLogoUrl: 'https://minicast.store/og-image.png',
    }),
    // Injected connector for MetaMask (desktop only)
    // Note: farcasterMiniApp and baseAccount will take priority in Mini Apps
    // This is only used when user explicitly connects on desktop
    injected({
      target: 'metaMask', // Prioritize MetaMask
    }),
  ],
})


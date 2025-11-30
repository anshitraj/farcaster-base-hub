import { http, createConfig } from 'wagmi'
import { base } from 'wagmi/chains'
import { farcasterMiniApp } from '@farcaster/miniapp-wagmi-connector'
import { baseAccount } from 'wagmi/connectors'

export const wagmiConfig = createConfig({
  chains: [base],
  transports: {
    [base.id]: http(),
  },
  connectors: [
    // Farcaster Mini App connector - Auto login inside Base + Farcaster
    // No popups, instant login, native FID + Base Account
    farcasterMiniApp(),
    // Base Account connector - Gas-sponsored transactions, passkey auth
    // Auto-connected wallet inside Base App, no wallet modal
    baseAccount({
      appName: 'Mini Cast Store',
      appLogoUrl: 'https://minicast.store/og-image.png',
    }),
  ],
})


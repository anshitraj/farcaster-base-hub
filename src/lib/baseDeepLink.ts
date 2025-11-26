export const getBaseDeepLink = (url: string) =>
  `base://app?url=${encodeURIComponent(url)}`;

export const getFarcasterDeepLink = (url: string) =>
  `farcaster://miniapp?url=${encodeURIComponent(url)}`;


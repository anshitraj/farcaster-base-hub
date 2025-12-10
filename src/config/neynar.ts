export const NEYNAR_API_BASE = "https://api.neynar.com";
export const NEYNAR_MINIAPP_SEARCH_PATH = "/v2/farcaster/frame/search/";

/**
 * Get Neynar API headers with authentication
 * @throws Error if NEYNAR_API_KEY is not configured
 */
export function getNeynarHeaders(): Record<string, string> {
  const apiKey = process.env.NEYNAR_API_KEY;

  if (!apiKey) {
    throw new Error(
      "NEYNAR_API_KEY environment variable is not configured. " +
      "Please add it to your .env.local file. " +
      "Get your API key from https://neynar.com"
    );
  }

  return {
    "x-api-key": apiKey,
    "Accept": "application/json",
  };
}


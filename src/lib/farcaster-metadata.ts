/**
 * Fetches and parses farcaster.json metadata from a domain
 */

export interface FarcasterMetadata {
  name?: string;
  icon?: string;
  screenshots?: string[];
  category?: string;
  description?: string;
  url?: string;
  developer?: {
    name?: string;
    url?: string;
  };
}

export async function fetchFarcasterMetadata(domain: string): Promise<FarcasterMetadata | null> {
  try {
    // Normalize domain (remove protocol, add https://)
    let normalizedDomain = domain.trim();
    if (!normalizedDomain.startsWith("http")) {
      normalizedDomain = `https://${normalizedDomain}`;
    }
    
    // Remove trailing slash
    normalizedDomain = normalizedDomain.replace(/\/$/, "");
    
    const metadataUrl = `${normalizedDomain}/.well-known/farcaster.json`;
    
    const response = await fetch(metadataUrl, {
      headers: {
        "Accept": "application/json",
      },
      // Add timeout
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    
    // Try to fetch icon.png from /.well-known/ if icon is not in JSON
    let iconUrl = data.icon;
    if (!iconUrl) {
      try {
        const iconPngUrl = `${normalizedDomain}/.well-known/icon.png`;
        const iconResponse = await fetch(iconPngUrl, {
          method: "HEAD", // Just check if it exists
          signal: AbortSignal.timeout(5000),
        });
        if (iconResponse.ok) {
          iconUrl = iconPngUrl;
        }
      } catch (e) {
        // Icon.png doesn't exist, continue with undefined
        console.log("icon.png not found at /.well-known/icon.png");
      }
    }
    
    // Validate and return
    return {
      name: data.name || undefined,
      icon: iconUrl || undefined,
      screenshots: Array.isArray(data.screenshots) ? data.screenshots : undefined,
      category: data.category || undefined,
      description: data.description || undefined,
      url: data.url || normalizedDomain,
      developer: data.developer || undefined,
    };
  } catch (error) {
    console.error("Error fetching farcaster.json:", error);
    return null;
  }
}

export function hashMetadata(metadata: FarcasterMetadata): string {
  // Simple hash function for comparing metadata
  const str = JSON.stringify(metadata);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash.toString();
}


/**
 * Fetches and parses farcaster.json metadata from a domain
 */

export interface FarcasterMetadata {
  name?: string;
  icon?: string;
  iconUrl?: string; // Frame iconUrl field
  screenshots?: string[];
  screenshotUrls?: string[]; // Frame screenshotUrls field
  category?: string;
  primaryCategory?: string; // Frame primaryCategory field
  description?: string;
  subtitle?: string; // Frame subtitle field
  url?: string;
  homeUrl?: string; // Frame homeUrl field
  frameUrl?: string; // Frame webhookUrl or frame URL
  ogImage?: string; // OG image / header image
  tags?: string[]; // Frame tags array
  developer?: {
    name?: string;
    url?: string;
  };
  owner?: string | string[]; // Owner address(es)
  owners?: string | string[]; // Alternative field name for owner(s)
  frame?: {
    name?: string;
    iconUrl?: string;
    description?: string;
    subtitle?: string;
    homeUrl?: string;
    webhookUrl?: string;
    tags?: string[];
    primaryCategory?: string;
    screenshotUrls?: string[];
    heroImageUrl?: string;
    imageUrl?: string;
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
    
    // Extract frame object (Farcaster mini-apps use frame structure)
    const frame = data.frame || data.miniapp || data;
    
    // Extract iconUrl from frame (this is the correct field)
    let iconUrl = frame.iconUrl || frame.icon || data.icon || null;
    
    // Handle relative icon URLs - convert to absolute
    if (iconUrl) {
      if (iconUrl.startsWith('/')) {
        // Relative path - convert to absolute using origin
        const origin = new URL(normalizedDomain).origin;
        iconUrl = origin + iconUrl;
      } else if (!iconUrl.startsWith('http')) {
        // Relative path without leading slash
        const origin = new URL(normalizedDomain).origin;
        iconUrl = `${origin}/${iconUrl}`;
      }
    }
    
    // Fallback: try /icon.png if no iconUrl found
    if (!iconUrl) {
      try {
        const iconPngUrl = `${normalizedDomain}/icon.png`;
        const iconResponse = await fetch(iconPngUrl, {
          method: "HEAD",
          signal: AbortSignal.timeout(5000),
        });
        if (iconResponse.ok) {
          iconUrl = iconPngUrl;
        }
      } catch (e) {
        console.log("icon.png not found at /icon.png");
      }
    }
    
    // Extract homeUrl (frame homeUrl or fallback to domain)
    const homeUrl = frame.homeUrl || data.url || normalizedDomain;
    
    // Extract other fields
    const name = frame.name || data.name;
    const description = frame.description || data.description;
    const subtitle = frame.subtitle || data.subtitle;
    const tags = frame.tags || data.tags || [];
    const category = frame.primaryCategory || data.category || data.primaryCategory;
    let screenshotUrls = frame.screenshotUrls || data.screenshots || [];
    const frameUrl = frame.webhookUrl || frame.frameUrl || data.frameUrl;
    const ogImage = frame.heroImageUrl || frame.imageUrl || data.ogImage || data["og-image"] || data["og_image"];
    
    // Normalize screenshot URLs - convert relative paths to absolute
    if (Array.isArray(screenshotUrls) && screenshotUrls.length > 0) {
      const origin = new URL(normalizedDomain).origin;
      screenshotUrls = screenshotUrls.map((url: string) => {
        if (!url) return url;
        if (url.startsWith('/')) {
          // Relative path - convert to absolute
          return origin + url;
        } else if (!url.startsWith('http')) {
          // Relative path without leading slash
          return `${origin}/${url}`;
        }
        return url; // Already absolute
      }).filter(Boolean); // Remove any empty/null values
    }
    
    // Validate and return
    return {
      name,
      icon: iconUrl || undefined,
      iconUrl: iconUrl || undefined,
      screenshots: Array.isArray(screenshotUrls) ? screenshotUrls : undefined,
      screenshotUrls: Array.isArray(screenshotUrls) ? screenshotUrls : undefined,
      category: category || undefined,
      primaryCategory: category || undefined,
      description: description || undefined,
      subtitle: subtitle || undefined,
      url: homeUrl || normalizedDomain,
      homeUrl: homeUrl || normalizedDomain,
      frameUrl: frameUrl || undefined,
      ogImage: ogImage || undefined,
      tags: Array.isArray(tags) ? tags : undefined,
      developer: data.developer || undefined,
      owner: data.owner || data.owners || undefined,
      owners: data.owners || data.owner || undefined,
      frame: frame || undefined,
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


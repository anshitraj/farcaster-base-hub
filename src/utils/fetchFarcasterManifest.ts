/**
 * Client-side utility to fetch farcaster.json manifest from a URL
 */

export interface FarcasterManifest {
  name?: string;
  icon?: string;
  iconUrl?: string;
  description?: string;
  subtitle?: string;
  category?: string;
  primaryCategory?: string;
  url?: string;
  homeUrl?: string;
  baseMiniAppUrl?: string;
  farcasterUrl?: string;
  frameUrl?: string;
  ogImage?: string;
  heroImageUrl?: string;
  imageUrl?: string;
  screenshots?: string[];
  screenshotUrls?: string[];
  tags?: string[];
  developer?: {
    name?: string;
    url?: string;
  };
  owner?: string | string[];
  owners?: string | string[];
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

export async function fetchFarcasterManifest(url: string): Promise<FarcasterManifest | null> {
  try {
    // Normalize URL
    let normalizedUrl = url.trim();
    if (!normalizedUrl.startsWith("http")) {
      normalizedUrl = `https://${normalizedUrl}`;
    }
    normalizedUrl = normalizedUrl.replace(/\/$/, "");
    
    const manifestUrl = `${normalizedUrl}/.well-known/farcaster.json`;
    
    const response = await fetch(manifestUrl, {
      headers: {
        "Accept": "application/json",
      },
      // 10 second timeout
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    
    // Extract frame object (Farcaster mini-apps use frame structure)
    const frame = data.frame || data.miniapp || data;
    
    // Extract iconUrl
    let iconUrl = frame.iconUrl || frame.icon || data.icon || null;
    
    // Handle relative icon URLs
    if (iconUrl) {
      if (iconUrl.startsWith('/')) {
        const origin = new URL(normalizedUrl).origin;
        iconUrl = origin + iconUrl;
      } else if (!iconUrl.startsWith('http')) {
        const origin = new URL(normalizedUrl).origin;
        iconUrl = `${origin}/${iconUrl}`;
      }
    }
    
    // Extract homeUrl
    const homeUrl = frame.homeUrl || data.url || normalizedUrl;
    
    // Extract other fields
    const name = frame.name || data.name;
    const description = frame.description || data.description;
    const subtitle = frame.subtitle || data.subtitle;
    const tags = frame.tags || data.tags || [];
    const category = frame.primaryCategory || data.category || data.primaryCategory;
    let screenshotUrls = frame.screenshotUrls || data.screenshots || [];
    const frameUrl = frame.webhookUrl || frame.frameUrl || data.frameUrl;
    const ogImage = frame.heroImageUrl || frame.imageUrl || data.ogImage || data["og-image"] || data["og_image"];
    
    // Normalize screenshot URLs
    if (Array.isArray(screenshotUrls) && screenshotUrls.length > 0) {
      const origin = new URL(normalizedUrl).origin;
      screenshotUrls = screenshotUrls.map((url: string) => {
        if (!url) return url;
        if (url.startsWith('/')) {
          return origin + url;
        } else if (!url.startsWith('http')) {
          return `${origin}/${url}`;
        }
        return url;
      }).filter(Boolean);
    }
    
    return {
      name,
      icon: iconUrl || undefined,
      iconUrl: iconUrl || undefined,
      description: description || undefined,
      subtitle: subtitle || undefined,
      category: category || undefined,
      primaryCategory: category || undefined,
      url: homeUrl || normalizedUrl,
      homeUrl: homeUrl || normalizedUrl,
      frameUrl: frameUrl || undefined,
      ogImage: ogImage || undefined,
      heroImageUrl: ogImage || undefined,
      imageUrl: ogImage || undefined,
      screenshots: Array.isArray(screenshotUrls) ? screenshotUrls : undefined,
      screenshotUrls: Array.isArray(screenshotUrls) ? screenshotUrls : undefined,
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


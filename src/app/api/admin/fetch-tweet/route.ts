import { NextRequest, NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth";
import { Developer } from "@/db/schema";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";

const TWITTER_BEARER_TOKEN = process.env.TWITTER_BEARER_TOKEN;

export const runtime = "nodejs";
export const dynamic = 'force-dynamic';

// Extract tweet ID from various Twitter URL formats
function extractTweetId(url: string): string | null {
  // Remove query parameters
  const cleanUrl = url.split('?')[0];
  
  // Match various Twitter URL formats:
  // https://twitter.com/username/status/1234567890
  // https://x.com/username/status/1234567890
  // https://www.twitter.com/username/status/1234567890
  // https://www.x.com/username/status/1234567890
  const patterns = [
    /(?:twitter\.com|x\.com)\/\w+\/status\/(\d+)/i,
    /status\/(\d+)/i,
  ];

  for (const pattern of patterns) {
    const match = cleanUrl.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  // If URL is just a number, assume it's a tweet ID
  if (/^\d+$/.test(cleanUrl)) {
    return cleanUrl;
  }

  return null;
}

interface TwitterTweet {
  id: string;
  text: string;
  created_at: string;
  author_id: string;
  attachments?: {
    media_keys?: string[];
  };
}

interface TwitterMedia {
  media_key: string;
  type: string;
  url?: string;
  preview_image_url?: string;
}

interface TwitterUser {
  id: string;
  name: string;
  username: string;
  profile_image_url?: string;
}

interface TwitterResponse {
  data?: TwitterTweet;
  includes?: {
    media?: TwitterMedia[];
    users?: TwitterUser[];
  };
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSessionFromCookies();
    if (!session) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Check admin access
    const developer = await db
      .select()
      .from(Developer)
      .where(eq(Developer.wallet, session.wallet.toLowerCase()))
      .limit(1);

    if (!developer[0] || !developer[0].adminRole) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { url } = body;

    if (!url) {
      return NextResponse.json(
        { error: "URL is required" },
        { status: 400 }
      );
    }

    // Extract tweet ID from URL
    const tweetId = extractTweetId(url);
    if (!tweetId) {
      return NextResponse.json(
        { error: "Invalid Twitter URL. Please provide a valid tweet URL." },
        { status: 400 }
      );
    }

    // Try Twitter API v2 first (if token is available)
    let apiSuccess = false;
    let tweetData: any = null;

    if (TWITTER_BEARER_TOKEN) {
      try {
        const apiUrl = new URL(`https://api.twitter.com/2/tweets/${tweetId}`);
        apiUrl.searchParams.set("tweet.fields", "created_at,author_id,attachments");
        apiUrl.searchParams.set("expansions", "author_id,attachments.media_keys");
        apiUrl.searchParams.set("media.fields", "type,url,preview_image_url");
        apiUrl.searchParams.set("user.fields", "name,username,profile_image_url");

        const response = await fetch(apiUrl.toString(), {
          headers: {
            Authorization: `Bearer ${TWITTER_BEARER_TOKEN}`,
            "Content-Type": "application/json",
          },
        });

        if (response.ok) {
          const data: TwitterResponse = await response.json();
          if (data.data) {
            const tweet = data.data;
            const user = data.includes?.users?.find((u) => u.id === tweet.author_id);
            
            // Find media (first photo if available)
            let media: TwitterMedia | null = null;
            if (tweet.attachments?.media_keys && data.includes?.media) {
              const mediaKeys = tweet.attachments.media_keys;
              for (const key of mediaKeys) {
                const foundMedia = data.includes.media.find((m) => m.media_key === key && m.type === "photo");
                if (foundMedia) {
                  media = foundMedia;
                  break;
                }
              }
            }

            // Limit content to 220 chars for display
            const content = tweet.text.length > 220 
              ? tweet.text.substring(0, 220) + "..."
              : tweet.text;

            tweetData = {
              content,
              authorName: user?.name || null,
              authorHandle: user ? `@${user.username}` : null,
              authorAvatar: user?.profile_image_url || null,
              mediaUrl: media?.url || media?.preview_image_url || null,
            };
            apiSuccess = true;
          }
        } else if (response.status !== 429 && response.status !== 401 && response.status !== 403) {
          // Only log non-rate-limit/auth errors, we'll try CDN fallback
          console.log(`Twitter API returned ${response.status}, trying CDN fallback...`);
        }
      } catch (error) {
        console.log("Twitter API request failed, trying CDN fallback...", error);
      }
    }

    // Fallback to Twitter's public CDN endpoint (no API key required)
    if (!apiSuccess) {
      try {
        const cdnUrl = `https://cdn.syndication.twimg.com/tweet?id=${tweetId}`;
        const cdnResponse = await fetch(cdnUrl, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          },
        });

        if (cdnResponse.ok) {
          const cdnData = await cdnResponse.json();
          
          // Parse CDN response format
          // CDN format is different from API v2
          const text = cdnData.text || cdnData.full_text || "";
          const author = cdnData.user || {};
          const authorName = author.name || author.screen_name || null;
          const authorHandle = author.screen_name ? `@${author.screen_name}` : null;
          const authorAvatar = author.profile_image_url_https || author.profile_image_url || null;
          
          // Extract media from CDN response
          let mediaUrl: string | null = null;
          if (cdnData.photos && cdnData.photos.length > 0) {
            // CDN provides photos array with url property
            mediaUrl = cdnData.photos[0].url || cdnData.photos[0] || null;
          } else if (cdnData.entities?.media && cdnData.entities.media.length > 0) {
            // Alternative location for media
            mediaUrl = cdnData.entities.media[0].media_url_https || cdnData.entities.media[0].media_url || null;
          }

          // Limit content to 220 chars for display
          const content = text.length > 220 
            ? text.substring(0, 220) + "..."
            : text;

          tweetData = {
            content,
            authorName,
            authorHandle,
            authorAvatar,
            mediaUrl,
          };
          apiSuccess = true;
        } else {
          console.log(`Twitter CDN returned ${cdnResponse.status}`);
        }
      } catch (error) {
        console.error("Twitter CDN fallback failed:", error);
      }
    }

    // Return results
    if (apiSuccess && tweetData) {
      return NextResponse.json({
        success: true,
        tweet: tweetData,
        source: TWITTER_BEARER_TOKEN ? "api" : "cdn", // Indicate which source was used
      });
    }

    // If both methods failed
    return NextResponse.json(
      { 
        error: "Could not fetch tweet. The tweet may be private, deleted, or unavailable. Please fill in the fields manually.",
        rateLimitError: true
      },
      { status: 404 }
    );
  } catch (error: any) {
    console.error("Error fetching tweet:", error);
    return NextResponse.json(
      { error: "Failed to fetch tweet", details: error.message },
      { status: 500 }
    );
  }
}


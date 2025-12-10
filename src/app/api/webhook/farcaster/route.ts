import { NextRequest, NextResponse } from "next/server";
import {
  parseWebhookEvent,
  verifyAppKeyWithNeynar,
} from "@farcaster/miniapp-node";

export const dynamic = 'force-dynamic';
export const runtime = "nodejs"; // Use nodejs runtime for better compatibility

export async function POST(req: NextRequest) {
  try {
    // Check if Neynar API key is configured
    const neynarApiKey = process.env.NEYNAR_API_KEY || process.env.NEYNAR_CLIENT_ID;
    if (!neynarApiKey) {
      console.warn("NEYNAR_API_KEY or NEYNAR_CLIENT_ID not configured - webhook verification may fail");
    }

    const body = await req.json();

    // Verify webhook signature + parse event
    // verifyAppKeyWithNeynar uses NEYNAR_API_KEY environment variable automatically
    const data = await parseWebhookEvent(body, verifyAppKeyWithNeynar);

    const { fid, appFid, event } = data;

    console.log("Webhook received:", {
      fid,
      appFid,
      eventType: event.event,
      timestamp: new Date().toISOString(),
    });

    switch (event.event) {
      case "miniapp_added":
        // Save notifications token for this user
        console.log("Mini app added:", {
          fid,
          notificationDetails: event.notificationDetails,
        });
        // TODO: Store notification token in database for this user
        break;

      case "notifications_enabled":
        console.log("Notifications enabled:", {
          fid,
          notificationDetails: event.notificationDetails,
        });
        // TODO: Update user's notification preferences in database
        break;

      case "notifications_disabled":
        console.log("Notifications disabled:", {
          fid,
        });
        // TODO: Update user's notification preferences in database
        break;

      case "miniapp_removed":
        console.log("Mini app removed:", {
          fid,
        });
        // TODO: Clean up user data if needed
        break;

      default:
        console.log("Unknown event type:", (event as any).event);
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Webhook error:", err);
    return NextResponse.json(
      { error: "Invalid webhook", details: err.message },
      { status: 400 }
    );
  }
}

// Handle GET requests (for testing/debugging)
export async function GET(req: NextRequest) {
  return NextResponse.json(
    { 
      message: "Webhook endpoint is active. Use POST to receive webhook events.",
      endpoint: "/api/webhook/farcaster",
    },
    { status: 200 }
  );
}


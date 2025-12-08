import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionFromCookies } from "@/lib/auth";
import { MiniApp } from "@/db/schema";
import { eq } from "drizzle-orm";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";

export const runtime = "nodejs";
export const dynamic = 'force-dynamic';

/**
 * Check if user is admin
 */
async function checkAdmin() {
  const session = await getSessionFromCookies();
  if (!session || !session.wallet) {
    return null;
  }

  // Check admin wallet from env
  const adminWallet = process.env.ADMIN_WALLET?.toLowerCase();
  if (adminWallet && session.wallet.toLowerCase() === adminWallet) {
    return session.wallet;
  }

  // Check database for admin role
  try {
    const { Developer } = await import("@/db/schema");
    const developer = await db.select()
      .from(Developer)
      .where(eq(Developer.wallet, session.wallet.toLowerCase()))
      .limit(1);
    
    if (developer[0]?.adminRole === "ADMIN") {
      return session.wallet;
    }
  } catch (e) {
    // Ignore errors
  }

  return null;
}

export async function POST(request: NextRequest) {
  try {
    const adminWallet = await checkAdmin();
    if (!adminWallet) {
      return NextResponse.json(
        { error: "Unauthorized. Admin access required." },
        { status: 403 }
      );
    }

    const formData = await request.formData();
    const appId = formData.get("appId") as string;
    const pngFile = formData.get("pngFile") as File | null;
    const webpFile = formData.get("webpFile") as File | null;

    if (!appId) {
      return NextResponse.json(
        { error: "App ID is required" },
        { status: 400 }
      );
    }

    if (!pngFile || !webpFile) {
      return NextResponse.json(
        { error: "Both PNG and WEBP files are required" },
        { status: 400 }
      );
    }

    // Verify app exists
    const appResult = await db.select()
      .from(MiniApp)
      .where(eq(MiniApp.id, appId))
      .limit(1);

    const app = appResult[0];
    if (!app) {
      return NextResponse.json(
        { error: "App not found" },
        { status: 404 }
      );
    }

    // Ensure badges directory exists
    const badgesDir = join(process.cwd(), "public", "badges");
    await mkdir(badgesDir, { recursive: true });

    // Save PNG file
    const pngBuffer = Buffer.from(await pngFile.arrayBuffer());
    const pngPath = join(badgesDir, `${appId}-dev.png`);
    await writeFile(pngPath, pngBuffer);

    // Save WEBP file
    const webpBuffer = Buffer.from(await webpFile.arrayBuffer());
    const webpPath = join(badgesDir, `${appId}-dev.webp`);
    await writeFile(webpPath, webpBuffer);

    // Generate metadata JSON
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    const metadata = {
      name: `${app.name} Developer Badge`,
      description: `Official developer of ${app.name} on MiniCast Store.`,
      image: `${baseUrl}/badges/${appId}-dev.png`
    };

    // Ensure metadata directory exists
    const metadataDir = join(process.cwd(), "public", "metadata", "developer");
    await mkdir(metadataDir, { recursive: true });

    // Save metadata file
    const metadataPath = join(metadataDir, `${appId}.json`);
    await writeFile(metadataPath, JSON.stringify(metadata, null, 2));

    // Update app record
    await db.update(MiniApp)
      .set({
        developerBadgeReady: true,
        developerBadgeImage: `/badges/${appId}-dev.webp`,
        developerBadgeMetadata: `/metadata/developer/${appId}.json`,
      })
      .where(eq(MiniApp.id, appId));

    return NextResponse.json({
      success: true,
      message: "Badge uploaded successfully",
      app: {
        id: app.id,
        name: app.name,
        developerBadgeReady: true,
      }
    });
  } catch (error: any) {
    console.error("[Admin Badge Upload] Error:", error);
    return NextResponse.json(
      { 
        error: "Failed to upload badge",
        details: error?.message || String(error)
      },
      { status: 500 }
    );
  }
}


import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { MiniApp, Developer } from "@/db/schema";
import { eq } from "drizzle-orm";
import { generateBadgeMetadata, generateBadgeSVG, generateBadgeDesign } from "@/lib/badge-generator";

export const dynamic = 'force-dynamic';
export const revalidate = 3600; // Cache for 1 hour
export const runtime = "edge";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Fetch app and developer
    const appData = await db.select({
      app: MiniApp,
      developer: {
        wallet: Developer.wallet,
      },
    })
      .from(MiniApp)
      .leftJoin(Developer, eq(MiniApp.developerId, Developer.id))
      .where(eq(MiniApp.id, params.id))
      .limit(1);

    const result = appData[0];
    if (!result) {
      return NextResponse.json(
        { error: "App not found" },
        { status: 404 }
      );
    }

    const { app, developer } = result;

    if (!developer) {
      return NextResponse.json(
        { error: "Developer not found" },
        { status: 404 }
      );
    }

    // Generate badge design and metadata
    const design = generateBadgeDesign(app.name, app.category, app.iconUrl);
    const badgeSVG = generateBadgeSVG(app.name, app.category, design, app.iconUrl);
    // Convert SVG to base64 (works in Edge runtime)
    const svgBase64 = btoa(unescape(encodeURIComponent(badgeSVG)));
    const svgDataUrl = `data:image/svg+xml;base64,${svgBase64}`;

    const metadata = generateBadgeMetadata(
      app.name,
      app.category,
      app.url,
      developer.wallet,
      svgDataUrl,
      app.id
    );

    return NextResponse.json(metadata, {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (error) {
    console.error("Metadata error:", error);
    return NextResponse.json(
      { error: "Failed to generate metadata" },
      { status: 500 }
    );
  }
}


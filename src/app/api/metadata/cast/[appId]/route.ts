import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";

export const runtime = "nodejs";
export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { appId: string } }
) {
  try {
    const metadataPath = join(process.cwd(), "public", "metadata", "cast", `${params.appId}.json`);
    
    try {
      const metadata = await readFile(metadataPath, "utf-8");
      return NextResponse.json(JSON.parse(metadata), {
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "public, max-age=3600",
        },
      });
    } catch (error) {
      // If file doesn't exist, generate default metadata
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
      const defaultMetadata = {
        name: "Cast Your App Badge",
        description: "Awarded for publishing an approved app on MiniCast Store.",
        image: `${baseUrl}/badges/castyourapptransparent.png`
      };
      
      return NextResponse.json(defaultMetadata, {
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "public, max-age=3600",
        },
      });
    }
  } catch (error) {
    console.error("[Metadata Cast] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch metadata" },
      { status: 500 }
    );
  }
}


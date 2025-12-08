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
    const metadataPath = join(process.cwd(), "public", "metadata", "developer", `${params.appId}.json`);
    
    try {
      const metadata = await readFile(metadataPath, "utf-8");
      return NextResponse.json(JSON.parse(metadata), {
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "public, max-age=3600",
        },
      });
    } catch (error) {
      return NextResponse.json(
        { error: "Metadata not found" },
        { status: 404 }
      );
    }
  } catch (error) {
    console.error("[Metadata Developer] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch metadata" },
      { status: 500 }
    );
  }
}


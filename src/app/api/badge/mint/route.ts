import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionFromCookies } from "@/lib/auth";
import { mintBadge } from "@/lib/badgeContract";
import { z } from "zod";

const mintSchema = z.object({
  developerWallet: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  appId: z.string().uuid(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getSessionFromCookies();
    const body = await request.json();
    const validated = mintSchema.parse(body);

    // Authenticate: only allow if session wallet == developerWallet OR admin
    if (!session || session.wallet.toLowerCase() !== validated.developerWallet.toLowerCase()) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Fetch app and developer
    const app = await prisma.miniApp.findUnique({
      where: { id: validated.appId },
      include: { developer: true },
    });

    if (!app) {
      return NextResponse.json(
        { error: "App not found" },
        { status: 404 }
      );
    }

    // Verify ownership via farcaster.json OR developer relationship
    let isOwner = false;
    
    // Check if wallet matches developer
    if (app.developer.wallet.toLowerCase() === validated.developerWallet.toLowerCase()) {
      isOwner = true;
    }
    
    // Also check farcaster.json owner field
    if (!isOwner && app.farcasterJson) {
      try {
        const farcasterData = JSON.parse(app.farcasterJson);
        const owners = farcasterData.owner || farcasterData.owners || [];
        const ownerList = Array.isArray(owners) ? owners : [owners];
        const normalizedOwners = ownerList.map((owner: string) => 
          owner.toLowerCase().trim()
        );
        
        if (normalizedOwners.includes(validated.developerWallet.toLowerCase())) {
          isOwner = true;
        }
      } catch (e) {
        console.error("Error parsing farcaster.json:", e);
      }
    }
    
    if (!isOwner) {
      return NextResponse.json(
        { error: "You are not the owner of this app. Your wallet must be in the farcaster.json owner field or you must be the app's developer." },
        { status: 403 }
      );
    }

    // Build metadata JSON
    const metadata = {
      name: `Built ${app.name} on Base`,
      description: `Developer badge for building ${app.name} on Base`,
      image: app.iconUrl,
      attributes: [
        { trait_type: "App Name", value: app.name },
        { trait_type: "Developer", value: app.developer.wallet },
        { trait_type: "App URL", value: app.url },
        { trait_type: "Created", value: app.createdAt.toISOString() },
      ],
    };

    // For MVP, use a simple HTTPS URL pattern
    // In production, you'd upload to IPFS or use a metadata service
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    const metadataUri = `${baseUrl}/api/metadata/badge/${app.id}`;

    // Mint badge
    let txHash: string;
    try {
      txHash = await mintBadge(validated.developerWallet, metadataUri);
    } catch (error) {
      console.error("Mint badge error:", error);
      return NextResponse.json(
        { error: "Failed to mint badge. Check contract configuration." },
        { status: 500 }
      );
    }

    // Create badge record
    const badge = await prisma.badge.create({
      data: {
        name: `Built ${app.name} on Base`,
        imageUrl: app.iconUrl,
        appName: app.name,
        developerId: app.developer.id,
        txHash,
      },
    });

    return NextResponse.json({ badge }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Mint badge error:", error);
    return NextResponse.json(
      { error: "Failed to mint badge" },
      { status: 500 }
    );
  }
}


import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireModerator } from "@/lib/admin";

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    await requireModerator(); // Moderators can export CSV

    const apps = await prisma.miniApp.findMany({
      include: {
        developer: {
          select: {
            name: true,
            wallet: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // CSV Headers
    const headers = [
      "App Name",
      "Developer Name",
      "Developer Wallet",
      "URL",
      "Base Mini App URL",
      "Farcaster URL",
      "Category",
      "Tags",
      "Contract Address",
      "Contract Verified",
      "App Verified",
      "Status",
      "Launch Count",
      "Unique Users",
      "Clicks",
      "Installs",
      "Rating Average",
      "Rating Count",
      "Popularity Score",
      "Created At",
      "Last Updated",
      "Auto Updated At",
      "Notes to Admin",
    ];

    // Convert apps to CSV rows
    const rows = apps.map((app) => {
      return [
        escapeCSV(app.name),
        escapeCSV(app.developer?.name || "Unknown"),
        escapeCSV(app.developer?.wallet || ""),
        escapeCSV(app.url),
        escapeCSV(app.baseMiniAppUrl || ""),
        escapeCSV(app.farcasterUrl || ""),
        escapeCSV(app.category),
        escapeCSV(app.developerTags.join(", ") || ""),
        escapeCSV(app.contractAddress || ""),
        app.contractVerified ? "Yes" : "No",
        app.verified ? "Yes" : "No",
        escapeCSV(app.status),
        app.launchCount.toString(),
        app.uniqueUsers.toString(),
        app.clicks.toString(),
        app.installs.toString(),
        app.ratingAverage.toFixed(2),
        app.ratingCount.toString(),
        app.popularityScore.toString(),
        app.createdAt.toISOString(),
        app.updatedAt.toISOString(),
        app.lastUpdatedAt ? app.lastUpdatedAt.toISOString() : "",
        escapeCSV(app.notesToAdmin || ""),
      ];
    });

    // Combine headers and rows
    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.join(",")),
    ].join("\n");

    // Return CSV file
    return new NextResponse(csvContent, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="mini-apps-export-${new Date().toISOString().split("T")[0]}.csv"`,
      },
    });
  } catch (error: any) {
    if (error.message === "Admin access required") {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    console.error("CSV export error:", error);
    return NextResponse.json(
      { error: "Failed to export CSV" },
      { status: 500 }
    );
  }
}

function escapeCSV(value: string): string {
  if (!value) return "";
  // If value contains comma, quote, or newline, wrap in quotes and escape quotes
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}


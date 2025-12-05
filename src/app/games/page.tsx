import { prisma } from "@/lib/db";
import GamesPageClient from "./GamesPageClient";

export const dynamic = 'force-dynamic';
export const revalidate = 60; // Revalidate every 60 seconds

async function getGames() {
  try {
    const apps = await prisma.miniApp.findMany({
      where: {
        status: "approved",
        category: "Games",
      },
      include: {
        developer: {
          select: {
            id: true,
            wallet: true,
            name: true,
            avatar: true,
            verified: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return apps.map((app) => ({
      ...app,
      topBaseRank: app.topBaseRank,
      autoUpdated: app.autoUpdated,
      contractVerified: app.contractVerified,
      developerTags: app.developerTags || [],
      tags: app.tags || [],
    }));
  } catch (error: any) {
    console.error("Error fetching games:", error);
    return [];
  }
}

export default async function GamesPage() {
  const games = await getGames();

  return <GamesPageClient initialGames={games} />;
}

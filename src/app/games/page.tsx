import { db } from "@/lib/db";
import GamesPageClient from "./GamesPageClient";
import { MiniApp, Developer } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";

export const dynamic = 'force-dynamic';
export const revalidate = 60; // Revalidate every 60 seconds

async function getGames() {
  try {
    const appsData = await db.select({
      app: MiniApp,
      developer: {
        id: Developer.id,
        wallet: Developer.wallet,
        name: Developer.name,
        avatar: Developer.avatar,
        verified: Developer.verified,
      },
    })
      .from(MiniApp)
      .leftJoin(Developer, eq(MiniApp.developerId, Developer.id))
      .where(and(
        eq(MiniApp.status, "approved"),
        eq(MiniApp.category, "Games")
      ))
      .orderBy(desc(MiniApp.createdAt));

    return appsData.map(({ app, developer }) => ({
      ...app,
      developer,
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

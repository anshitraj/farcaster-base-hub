/**
 * Script to fix review counts in the database
 * This ensures ratingCount matches the actual number of reviews
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function fixReviewCounts() {
  try {
    console.log("Starting review count fix...");

    // Get all apps
    const apps = await prisma.miniApp.findMany({
      include: {
        reviews: true,
      },
    });

    console.log(`Found ${apps.length} apps to check`);

    let fixed = 0;
    let unchanged = 0;

    for (const app of apps) {
      const actualReviewCount = app.reviews.length;
      const actualRatingAverage =
        actualReviewCount > 0
          ? app.reviews.reduce((sum, r) => sum + r.rating, 0) / actualReviewCount
          : 0;

      // Only update if counts don't match
      if (app.ratingCount !== actualReviewCount || app.ratingAverage !== actualRatingAverage) {
        await prisma.miniApp.update({
          where: { id: app.id },
          data: {
            ratingCount: actualReviewCount,
            ratingAverage: actualRatingAverage,
          },
        });

        console.log(
          `Fixed ${app.name}: ratingCount ${app.ratingCount} -> ${actualReviewCount}, ratingAverage ${app.ratingAverage} -> ${actualRatingAverage}`
        );
        fixed++;
      } else {
        unchanged++;
      }
    }

    console.log(`\nDone! Fixed ${fixed} apps, ${unchanged} unchanged.`);
  } catch (error) {
    console.error("Error fixing review counts:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

fixReviewCounts();


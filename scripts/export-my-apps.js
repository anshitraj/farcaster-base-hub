/**
 * Export your actual apps from the database
 * This exports all apps currently in your database (the ones you imported locally)
 */

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function exportApps() {
  try {
    console.log('🔍 Fetching all apps from database...\n');
    
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
        createdAt: 'desc',
      },
    });

    console.log(`✅ Found ${apps.length} apps in database\n`);

    if (apps.length === 0) {
      console.log('⚠️  No apps found in database. Your database is empty.');
      return;
    }

    // Export as CSV-style JSON (same format as seed file)
    const exportedApps = apps.map((app) => ({
      'App Name': app.name,
      'Developer Name': app.developer?.name || 'Unknown',
      'Developer Wallet': app.developer?.wallet || '',
      'URL': app.url,
      'Base Mini App URL': app.baseMiniAppUrl || '',
      'Farcaster URL': app.farcasterUrl || '',
      'Category': app.category,
      'Tags': app.tags?.join(', ') || '',
      'Contract Address': app.contractAddress || '',
      'Contract Verified': app.contractVerified ? 'Yes' : 'No',
      'App Verified': app.verified ? 'Yes' : 'No',
      'Status': app.status,
      'Launch Count': app.launchCount || 0,
      'Unique Users': app.uniqueUsers || 0,
      'Clicks': app.clicks || 0,
      'Installs': app.installs || 0,
      'Rating Average': app.ratingAverage || 0,
      'Rating Count': app.ratingCount || 0,
      'Popularity Score': app.popularityScore || 0,
      'Created At': app.createdAt.toISOString(),
      'Last Updated': app.updatedAt.toISOString(),
      'Auto Updated At': app.lastUpdatedAt ? app.lastUpdatedAt.toISOString() : '',
      'Notes to Admin': app.notesToAdmin || '',
      'Icon URL': app.iconUrl || '',
      'Header Image URL': app.headerImageUrl || '',
      'Screenshots': app.screenshots?.join(', ') || '',
    }));

    // Save to file
    const exportPath = path.join(process.cwd(), 'data', 'my-exported-apps.json');
    fs.writeFileSync(exportPath, JSON.stringify(exportedApps, null, 2), 'utf8');

    console.log(`✅ Exported ${exportedApps.length} apps to: ${exportPath}\n`);
    console.log('📋 App Summary:');
    console.log(`   Total apps: ${apps.length}`);
    console.log(`   Approved: ${apps.filter(a => a.status === 'approved').length}`);
    console.log(`   Pending: ${apps.filter(a => a.status === 'pending').length}`);
    console.log(`   Categories: ${[...new Set(apps.map(a => a.category))].join(', ')}\n`);
    
    console.log('💡 Next Steps:');
    console.log('   1. This file contains YOUR actual imported apps');
    console.log('   2. You can import this in production using the admin panel');
    console.log('   3. Use this URL: http://localhost:3000/data/my-exported-apps.json');
    console.log('   4. Or upload to your production and use: https://minicast.store/data/my-exported-apps.json\n');

  } catch (error) {
    console.error('❌ Error exporting apps:', error.message);
    if (error.message.includes("Can't reach database")) {
      console.log('\n💡 Make sure your DATABASE_URL is set correctly in .env.local');
    }
  } finally {
    await prisma.$disconnect();
  }
}

exportApps();







const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testConnection() {
  try {
    console.log('🔍 Testing database connection...');
    console.log('DATABASE_URL:', process.env.DATABASE_URL?.replace(/:[^:@]+@/, ':****@'));
    
    await prisma.$connect();
    console.log('✅ Database connection successful!');
    
    // Try a simple query
    const result = await prisma.$queryRaw`SELECT 1 as test`;
    console.log('✅ Database query successful!', result);
    
    await prisma.$disconnect();
    console.log('\n✅ All tests passed! Database is ready.');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Database connection failed:');
    console.error(error.message);
    
    if (error.message.includes("Can't reach database server")) {
      console.log('\n💡 Possible solutions:');
      console.log('1. ⚠️  Check if your Supabase project is PAUSED');
      console.log('   → Go to https://supabase.com/dashboard');
      console.log('   → Find your project and click "Resume" if it\'s paused');
      console.log('   → Free tier projects pause after 1 week of inactivity');
      console.log('');
      console.log('2. 🔗 Verify your DATABASE_URL in .env file');
      console.log('   → Should be: postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres?sslmode=require');
      console.log('');
      console.log('3. 🌐 Try using the connection pooler URL:');
      console.log('   → Format: postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true&sslmode=require');
      console.log('   → Get the pooler URL from Supabase Dashboard → Settings → Database → Connection Pooling');
      console.log('');
      console.log('4. 🔒 Check your network/firewall settings');
      console.log('   → Ensure port 5432 or 6543 is not blocked');
    }
    
    await prisma.$disconnect();
    process.exit(1);
  }
}

testConnection();

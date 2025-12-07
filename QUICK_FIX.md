# 🚀 Quick Fix Guide

## Your Current Errors

1. ❌ `DATABASE_URL` is not set → Drizzle can't connect
2. ❌ Import script uses Prisma → But project uses Drizzle

## ✅ Solutions

### Step 1: Create `.env.local` File

Create a file named `.env.local` in the `farcaster-base-hub` folder:

**Windows (PowerShell):**
```powershell
cd farcaster-base-hub
@"
DATABASE_URL="your-database-connection-string-here"
"@ | Out-File -FilePath .env.local -Encoding utf8
```

**Windows (CMD):**
```cmd
cd farcaster-base-hub
echo DATABASE_URL="your-database-connection-string-here" > .env.local
```

**Mac/Linux:**
```bash
cd farcaster-base-hub
cat > .env.local << EOF
DATABASE_URL="your-database-connection-string-here"
EOF
```

**Or manually:**
1. Open `farcaster-base-hub` folder
2. Create new file named `.env.local` (include the dot!)
3. Add this line:
   ```
   DATABASE_URL="your-database-connection-string-here"
   ```

### Step 2: Get Your Database Connection String

**If using Neon:**
- Go to https://console.neon.tech
- Copy the connection string (looks like: `postgresql://user:pass@ep-xxx.neon.tech/db?sslmode=require`)

**If using Supabase:**
- Go to https://supabase.com/dashboard
- Project Settings → Database → Connection String
- Copy the connection string

**If using local PostgreSQL:**
- Use: `postgresql://postgres:password@localhost:5432/database_name`

### Step 3: Push Database Schema

```bash
npm run drizzle:push
```

### Step 4: Import Seed Data (Using New Drizzle Script)

```bash
npm run import:seed:drizzle
```

---

## ✅ That's It!

After these steps:
- ✅ Database schema will be created
- ✅ 83 apps will be imported
- ✅ Logo will show (already fixed!)
- ✅ Apps will appear on homepage

---

## Need More Help?

See `SETUP_DATABASE.md` for detailed troubleshooting.

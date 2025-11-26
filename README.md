# Mini App Store

A full-stack Next.js application for discovering, submitting, and managing Farcaster & Base mini apps.

## Features

- 🚀 **Discover Mini Apps** - Browse trending and new mini apps
- 📱 **Mobile-First Design** - Optimized for Base App & Farcaster in-app browser
- ⭐ **Ratings & Reviews** - Rate and review mini apps
- 👨‍💻 **Developer Dashboard** - Track your apps' performance
- 🏆 **Developer Badges** - Earn SBT badges for building on Base
- 🔐 **Wallet Authentication** - Simple wallet-based auth

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: TailwindCSS (dark mode only)
- **UI Components**: Shadcn/UI
- **Database**: PostgreSQL (via Prisma ORM)
- **Blockchain**: Ethers.js for contract interactions
- **Deployment**: Vercel-ready

## Prerequisites

- Node.js 18+ and npm/yarn/pnpm
- PostgreSQL database (local or Supabase)
- Base RPC endpoint (Alchemy recommended)
- (Optional) Badge contract address and admin key

## Setup Instructions

### 1. Clone and Install

```bash
cd farcaster-base-hub
npm install
```

### 2. Environment Variables

Copy `.env.local.example` to `.env.local` and fill in your values:

```bash
cp .env.local.example .env.local
```

Required variables:
- `DATABASE_URL` - PostgreSQL connection string
- `ALCHEMY_BASE_URL` - Base RPC endpoint
- `JWT_SECRET` - Random secret for session tokens
- `NEXT_PUBLIC_BASE_URL` - Your app's public URL

Optional (for badge minting):
- `BADGE_CONTRACT_ADDRESS` - SBT contract address
- `BADGE_ADMIN_PRIVATE_KEY` - Admin wallet private key

### 3. Database Setup

Generate Prisma client and push schema:

```bash
npm run db:generate
npm run db:push
```

Or run migrations:

```bash
npm run db:migrate
```

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
farcaster-base-hub/
├── src/
│   ├── app/              # Next.js App Router pages
│   │   ├── api/          # API routes
│   │   ├── apps/         # App listing & detail pages
│   │   ├── developers/   # Developer pages
│   │   └── ...
│   ├── components/       # React components
│   ├── lib/              # Utilities & helpers
│   │   ├── db.ts         # Prisma client
│   │   ├── auth.ts       # Auth helpers
│   │   ├── trending.ts   # Trending algorithm
│   │   └── ...
│   └── ...
├── prisma/
│   └── schema.prisma     # Database schema
└── public/               # Static assets
```

## API Routes

- `POST /api/auth/wallet` - Authenticate with wallet
- `GET /api/apps` - List apps (with filters)
- `GET /api/apps/trending` - Get trending apps
- `GET /api/apps/[id]` - Get app details
- `POST /api/apps/submit` - Submit new app
- `POST /api/apps/[id]/click` - Log app event
- `POST /api/reviews` - Create review
- `GET /api/developers/[wallet]` - Get developer profile
- `GET /api/developers/[wallet]/dashboard` - Get dashboard stats
- `POST /api/badge/mint` - Mint developer badge

## Database Models

- **Developer** - Developer profiles
- **MiniApp** - Mini app listings
- **Review** - User reviews
- **Badge** - Developer badges (SBTs)
- **AppEvent** - Click/install tracking
- **UserSession** - Wallet sessions

## Mobile Optimization

The app is fully optimized for mobile devices and in-app browsers:

- ✅ Large tap targets (min 44px)
- ✅ Single-column layouts on mobile
- ✅ No hover-only interactions
- ✅ Safe area insets support
- ✅ Base & Farcaster deep links

## Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Import project in Vercel
3. Add environment variables
4. Deploy!

### Environment Variables for Production

Make sure to set all required env vars in your deployment platform.

## Development

### Database Studio

View and edit data:

```bash
npm run db:studio
```

### Prisma Commands

```bash
npm run db:generate  # Generate Prisma client
npm run db:push      # Push schema changes
npm run db:migrate   # Run migrations
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT

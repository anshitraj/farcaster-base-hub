# 🔧 Vercel Build Fix Guide

## Issues Found During Build

1. **Missing Suspense boundaries** - Pages using `useSearchParams()` need Suspense
2. **Database connection errors** - Expected during static generation (routes are dynamic)
3. **Dynamic server usage warnings** - Expected for API routes using cookies/searchParams

## ✅ Fixes Applied

### 1. Suspense Boundaries
- ✅ Wrapped `/apps` page in Suspense
- ✅ Wrapped `/search` page in Suspense
- Need to mark other pages as dynamic

### 2. Mark Pages as Dynamic

Add `export const dynamic = 'force-dynamic'` to pages that:
- Use `useSearchParams()`
- Use cookies
- Fetch dynamic data

## Pages to Fix:

- [x] `/apps` - Added Suspense
- [x] `/search` - Added Suspense  
- [ ] `/developers` - Mark as dynamic
- [ ] `/favourites` - Mark as dynamic
- [ ] `/games` - Mark as dynamic
- [ ] `/` (homepage) - Mark as dynamic
- [ ] `/submit` - Mark as dynamic (or check if SubmitForm uses useSearchParams)

## Quick Fix: Mark All Client Pages as Dynamic

Add this to the top of each page file (after imports):

```typescript
export const dynamic = 'force-dynamic';
```

This tells Next.js not to try to statically generate these pages during build.

## API Routes

API routes that use:
- `cookies()`
- `nextUrl.searchParams`
- Database connections

Should already be dynamic by default, but the warnings during build are expected and harmless.

## Database Connection Errors

The errors like:
```
Can't reach database server at `db.bxubjfdkrljzuvwiyjrl.supabase.co:5432`
```

Happen during build because Next.js tries to statically generate some routes. Once we mark pages as dynamic, these errors will disappear.


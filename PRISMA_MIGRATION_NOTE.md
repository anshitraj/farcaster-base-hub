# Prisma Migration Note

## Advertisement Model Added

A new `Advertisement` model has been added to the Prisma schema. 

### To Complete Setup:

1. **Run Database Migration:**
   ```bash
   npx prisma migrate dev --name add_advertisements
   ```
   Or if DATABASE_URL is not set locally:
   ```bash
   npx prisma db push
   ```

2. **Regenerate Prisma Client:**
   ```bash
   npx prisma generate
   ```
   Or:
   ```bash
   npm run db:generate
   ```

3. **If you get file lock errors on Windows:**
   - Close any running Next.js dev servers
   - Close any database tools (Prisma Studio, etc.)
   - Try again

### After Migration:

The build should succeed once the Prisma client is regenerated with the new `Advertisement` model.


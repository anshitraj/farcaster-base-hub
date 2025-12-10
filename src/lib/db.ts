import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "@/db/schema";

if (!process.env.DATABASE_URL) {
  console.error("⚠️ DATABASE_URL is not set! Database operations will fail.");
}

// Clean DATABASE_URL: Remove channel_binding parameter which causes issues with neon()
function cleanDatabaseUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    // Remove channel_binding parameter
    urlObj.searchParams.delete("channel_binding");
    return urlObj.toString();
  } catch {
    // If URL parsing fails, try simple string replacement
    return url.replace(/[?&]channel_binding=[^&]*/g, "");
  }
}

const cleanedUrl = process.env.DATABASE_URL 
  ? cleanDatabaseUrl(process.env.DATABASE_URL)
  : undefined;

// Provide a meaningful error if DATABASE_URL is missing
// Note: This file should only be imported in server-side code (API routes, server components)
// Client components should use @/lib/rank-utils instead of importing quest-helpers
if (!cleanedUrl) {
  throw new Error(
    "DATABASE_URL environment variable is required. " +
    "Please set it in your .env.local file or environment configuration."
  );
}

const sql = neon(cleanedUrl);
export const db = drizzle(sql, { schema });

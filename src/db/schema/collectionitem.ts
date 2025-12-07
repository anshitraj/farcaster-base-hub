import { pgTable, timestamp, uuid, uniqueIndex } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { Collection } from "./collection";
import { MiniApp } from "./miniapp";

export const CollectionItem = pgTable("CollectionItem", {
  id: uuid("id").primaryKey().defaultRandom(),
  collectionId: uuid("collectionId").notNull().references(() => Collection.id, { onDelete: "cascade" }),
  appId: uuid("appId").notNull().references(() => MiniApp.id, { onDelete: "cascade" }),
  addedAt: timestamp("addedAt").default(sql`now()`).notNull(),
}, (table) => ({
  uniqueCollectionApp: uniqueIndex("unique_collection_app").on(table.collectionId, table.appId),
}));


import { pgTable, text, integer, timestamp, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { MiniApp } from "./miniapp";
import { Developer } from "./developer";

export const Review = pgTable("Review", {
  id: uuid("id").primaryKey().defaultRandom(),
  rating: integer("rating").notNull(),
  comment: text("comment"),
  miniAppId: uuid("miniAppId").notNull().references(() => MiniApp.id, { onDelete: "cascade" }),
  developerId: uuid("developerId").references(() => Developer.id, { onDelete: "set null" }),
  developerReply: text("developerReply"),
  developerReplyDate: timestamp("developerReplyDate"),
  createdAt: timestamp("createdAt").default(sql`now()`).notNull(),
});


import { pgTable, text, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";

/** Synthetic browser workspaces, NOT authentication or real university records. */
export const campusSessions = pgTable("campus_sessions", {
  id: text("id").primaryKey(),
  state: jsonb("state").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
export const insertCampusSessionSchema = createInsertSchema(campusSessions);
export type CampusSession = typeof campusSessions.$inferSelect;

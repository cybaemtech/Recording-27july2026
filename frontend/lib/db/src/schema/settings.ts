import { pgTable, serial, varchar, text, timestamp } from "drizzle-orm/pg-core";

export const settingsTable = pgTable("settings", {
  id: serial("id").primaryKey(),
  key: varchar("key", { length: 255 }).unique().notNull(),
  value: text("value"),
  updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => new Date()),
});

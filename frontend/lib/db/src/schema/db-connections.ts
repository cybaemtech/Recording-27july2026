import { pgTable, serial, text, timestamp, boolean, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const dbConnectionsTable = pgTable("db_connections", {
  id: serial("id").primaryKey(),
  providerId: text("provider_id").notNull().unique(), // "aws" | "azure" | "supabase" | "gcp"
  providerName: text("provider_name").notNull(),
  connectionName: text("connection_name").notNull(),
  region: text("region").notNull(),
  accessKey: text("access_key").notNull(),
  secretKey: text("secret_key").notNull(),
  bucketName: text("bucket_name").notNull(),
  isConnected: boolean("is_connected").notNull().default(false),
  badgeTag: text("badge_tag"),
  shortDesc: text("short_desc"),
  lastConnected: text("last_connected"),
  lastSync: text("last_sync"),
  usedBytesText: text("used_bytes_text"),
  totalCapacityText: text("total_capacity_text"),
  usagePercentage: real("usage_percentage").default(0),
  availableText: text("available_text"),
  healthStatusText: text("health_status_text"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const dbConnectionHistoryTable = pgTable("db_connection_history", {
  id: serial("id").primaryKey(),
  historyId: text("history_id"),
  providerId: text("provider_id"),
  providerName: text("provider_name"),
  action: text("action").notNull(),
  status: text("status").notNull().default("success"),
  details: text("details"),
  timestamp: timestamp("timestamp", { withTimezone: true }).notNull().defaultNow(),
});

export const insertDbConnectionSchema = createInsertSchema(dbConnectionsTable).omit({ id: true, updatedAt: true });
export type InsertDbConnection = z.infer<typeof insertDbConnectionSchema>;
export type DbConnection = typeof dbConnectionsTable.$inferSelect;

export const insertDbConnectionHistorySchema = createInsertSchema(dbConnectionHistoryTable).omit({ id: true, timestamp: true });
export type InsertDbConnectionHistory = z.infer<typeof insertDbConnectionHistorySchema>;
export type DbConnectionHistory = typeof dbConnectionHistoryTable.$inferSelect;

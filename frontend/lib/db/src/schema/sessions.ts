import { pgTable, serial, text, timestamp, integer, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { devicesTable } from "./devices";

export const sessionsTable = pgTable("sessions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  deviceId: integer("device_id").notNull().references(() => devicesTable.id, { onDelete: "cascade" }),
  loginTime: timestamp("login_time", { withTimezone: true }).notNull().defaultNow(),
  logoutTime: timestamp("logout_time", { withTimezone: true }),
  durationSeconds: integer("duration_seconds"),
  recordingSizeBytes: integer("recording_size_bytes"),
  recordingUrl: text("recording_url"),
  uploadStatus: text("upload_status", { enum: ["pending", "uploading", "completed", "failed"] }).notNull().default("pending"),
  recordingStatus: text("recording_status", { enum: ["active", "paused", "completed", "failed"] }).notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => [
  index("sessions_user_id_idx").on(table.userId),
  index("sessions_device_id_idx").on(table.deviceId),
  index("sessions_login_time_idx").on(table.loginTime),
]);

export const insertSessionSchema = createInsertSchema(sessionsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertSession = z.infer<typeof insertSessionSchema>;
export type Session = typeof sessionsTable.$inferSelect;

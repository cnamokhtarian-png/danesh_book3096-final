/**
 * دانش‌بوک — Database schema (PostgreSQL / Supabase compatible)
 *
 * IMPORTANT: column names are written in camelCase (e.g. `karmaPoints`,
 * `studentCode`) and must stay byte-for-byte identical to the names used in
 * server code and API routes. Drizzle quotes identifiers, so the camelCase
 * casing is preserved inside PostgreSQL.
 */
import { relations } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";

export const users = pgTable(
  "users",
  {
    id: serial("id").primaryKey(),
    fullName: varchar("fullName", { length: 120 }).notNull(),
    email: varchar("email", { length: 190 }).notNull(),
    passwordHash: text("passwordHash").notNull(),
    studentCode: varchar("studentCode", { length: 40 }),
    university: varchar("university", { length: 140 }),
    major: varchar("major", { length: 140 }),
    bio: varchar("bio", { length: 400 }),
    avatarEmoji: varchar("avatarEmoji", { length: 12 }).notNull().default("🎓"),
    karmaPoints: integer("karmaPoints").notNull().default(20),
    role: varchar("role", { length: 16 }).notNull().default("student"),
    createdAt: timestamp("createdAt", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("users_email_unique").on(table.email),
    uniqueIndex("users_studentCode_unique").on(table.studentCode),
  ],
);
export const sessions = pgTable(
  "sessions",
  {
    token: varchar("token", { length: 64 }).primaryKey(),
    userId: integer("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expiresAt", { withTimezone: true }).notNull(),
    createdAt: timestamp("createdAt", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("sessions_userId_idx").on(table.userId)],
);

/** `kind` = "book" (کتاب) | "note" (جزوه) */
export const books = pgTable(
  "books",
  {
    id: serial("id").primaryKey(),
    ownerId: integer("ownerId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 160 }).notNull(),
    /** "book" | "note" | "slide" | "exam" */
    kind: varchar("kind", { length: 12 }).notNull().default("book"),
    /** "physical" | "digital" */
    medium: varchar("medium", { length: 12 }).notNull().default("physical"),
    /** "sell" | "exchange" | "free" | "request" */
    offerType: varchar("offerType", { length: 12 }).notNull().default("exchange"),
    /** "general" | "konkur" */
    audience: varchar("audience", { length: 12 }).notNull().default("general"),
    course: varchar("course", { length: 140 }),
    author: varchar("author", { length: 140 }),
    university: varchar("university", { length: 140 }),
    category: varchar("category", { length: 32 }).notNull().default("general"),
    condition: varchar("condition", { length: 20 }).notNull().default("good"),
    price: integer("price").notNull().default(0),
    isExchangeable: boolean("isExchangeable").notNull().default(true),
    description: varchar("description", { length: 1200 }),
    coverEmoji: varchar("coverEmoji", { length: 12 }).notNull().default("📘"),
    status: varchar("status", { length: 16 }).notNull().default("available"),
    views: integer("views").notNull().default(0),
    createdAt: timestamp("createdAt", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("books_createdAt_idx").on(table.createdAt),
    index("books_ownerId_idx").on(table.ownerId),
    index("books_category_idx").on(table.category),
  ],
);

/** درخواست تبادل / خرید / امانت‌گیری */
export const requests = pgTable(
  "requests",
  {
    id: serial("id").primaryKey(),
    bookId: integer("bookId")
      .notNull()
      .references(() => books.id, { onDelete: "cascade" }),
    userId: integer("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    ownerId: integer("ownerId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    kind: varchar("kind", { length: 16 }).notNull().default("exchange"),
    message: varchar("message", { length: 600 }),
    status: varchar("status", { length: 16 }).notNull().default("pending"),
    createdAt: timestamp("createdAt", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("requests_bookId_idx").on(table.bookId),
    index("requests_ownerId_idx").on(table.ownerId),
    index("requests_userId_idx").on(table.userId),
  ],
);

export const usersRelations = relations(users, ({ many }) => ({
  books: many(books),
  requests: many(requests),
}));

export const booksRelations = relations(books, ({ one, many }) => ({
  owner: one(users, { fields: [books.ownerId], references: [users.id] }),
  requests: many(requests),
}));

export const requestsRelations = relations(requests, ({ one }) => ({
  book: one(books, { fields: [requests.bookId], references: [books.id] }),
  requester: one(users, { fields: [requests.userId], references: [users.id] }),
}));

/**
 * پیشنهادات و پیام‌های پشتیبانی — از فرم کاربران ذخیره می‌شود و در
 * داشبورد ادمین مدیریت می‌شود.
 */
export const suggestions = pgTable(
  "suggestions",
  {
    id: serial("id").primaryKey(),
    fullName: varchar("fullName", { length: 120 }).notNull(),
    /** ایمیل یا شماره تماس کاربر */
    contact: varchar("contact", { length: 190 }).notNull(),
    subject: varchar("subject", { length: 160 }).notNull(),
    message: text("message").notNull(),
    /** "new" | "reviewing" | "resolved" */
    status: varchar("status", { length: 16 }).notNull().default("new"),
    adminNote: varchar("adminNote", { length: 600 }),
    createdAt: timestamp("createdAt", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("suggestions_createdAt_idx").on(table.createdAt)],
);

export type User = typeof users.$inferSelect;
export type Book = typeof books.$inferSelect;
export type Request = typeof requests.$inferSelect;
export type Suggestion = typeof suggestions.$inferSelect;

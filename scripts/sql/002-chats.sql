-- گفتگوی خصوصی کاربران درباره آگهی‌ها؛ افزایشی و بدون تغییر داده‌های قبلی.
CREATE TABLE IF NOT EXISTS "conversations" (
  "id" serial PRIMARY KEY,
  "bookId" integer NOT NULL REFERENCES "books"("id") ON DELETE CASCADE,
  "buyerId" integer NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "ownerId" integer NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS "conversations_book_buyer_unique" ON "conversations" ("bookId", "buyerId");
CREATE INDEX IF NOT EXISTS "conversations_buyerId_idx" ON "conversations" ("buyerId");
CREATE INDEX IF NOT EXISTS "conversations_ownerId_idx" ON "conversations" ("ownerId");

CREATE TABLE IF NOT EXISTS "chatMessages" (
  "id" serial PRIMARY KEY,
  "conversationId" integer NOT NULL REFERENCES "conversations"("id") ON DELETE CASCADE,
  "senderId" integer NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "body" varchar(1000) NOT NULL,
  "createdAt" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "chatMessages_conversation_created_idx" ON "chatMessages" ("conversationId", "createdAt");

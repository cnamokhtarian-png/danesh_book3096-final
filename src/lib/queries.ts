/**
 * Server-side data access. Every helper is wrapped in try/catch and returns a
 * safe fallback so a database hiccup can never turn a page into a 500 error.
 */
import { and, desc, eq, ilike, ne, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { books, requests, suggestions, users } from "@/db/schema";

export type BookCardData = {
  id: number;
  title: string;
  kind: string;
  medium: string;
  offerType: string;
  audience: string;
  course: string | null;
  author: string | null;
  university: string | null;
  category: string;
  condition: string;
  price: number;
  isExchangeable: boolean;
  coverEmoji: string;
  status: string;
  views: number;
  description: string | null;
  createdAt: Date;
  ownerId: number;
  ownerName: string;
  ownerEmoji: string;
  ownerKarma: number;
};

const bookSelection = {
  id: books.id,
  title: books.title,
  kind: books.kind,
  medium: books.medium,
  offerType: books.offerType,
  audience: books.audience,
  course: books.course,
  author: books.author,
  university: books.university,
  category: books.category,
  condition: books.condition,
  price: books.price,
  isExchangeable: books.isExchangeable,
  coverEmoji: books.coverEmoji,
  status: books.status,
  views: books.views,
  description: books.description,
  createdAt: books.createdAt,
  ownerId: users.id,
  ownerName: users.fullName,
  ownerEmoji: users.avatarEmoji,
  ownerKarma: users.karmaPoints,
};

export type BookFilters = {
  q?: string;
  kind?: string;
  medium?: string;
  offerType?: string;
  audience?: string;
  category?: string;
  university?: string;
  sort?: string;
  limit?: number;
};

export async function listBooks(filters: BookFilters = {}): Promise<BookCardData[]> {
  try {
    const conditions: SQL[] = [];

    if (filters.q) {
      const needle = `%${filters.q.trim()}%`;
      const search = or(
        ilike(books.title, needle),
        ilike(books.course, needle),
        ilike(books.author, needle),
        ilike(books.university, needle),
      );
      if (search) conditions.push(search);
    }
    if (filters.kind) conditions.push(eq(books.kind, filters.kind));
    if (filters.medium === "physical" || filters.medium === "digital") {
      conditions.push(eq(books.medium, filters.medium));
    }
    if (filters.offerType) conditions.push(eq(books.offerType, filters.offerType));
    if (filters.audience) conditions.push(eq(books.audience, filters.audience));
    if (filters.category) conditions.push(eq(books.category, filters.category));
    if (filters.university) conditions.push(eq(books.university, filters.university));

    const orderBy =
      filters.sort === "cheap"
        ? [sql`${books.price} asc`]
        : filters.sort === "popular"
          ? [desc(books.views), desc(books.id)]
          : [desc(books.createdAt), desc(books.id)];

    return await db
      .select(bookSelection)
      .from(books)
      .innerJoin(users, eq(users.id, books.ownerId))
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(...orderBy)
      .limit(Math.min(filters.limit ?? 24, 60));
  } catch (error) {
    console.error("[daneshbook:query] listBooks failed:", (error as Error).message);
    return [];
  }
}

export async function getBookById(id: number): Promise<BookCardData | null> {
  try {
    const rows = await db
      .select(bookSelection)
      .from(books)
      .innerJoin(users, eq(users.id, books.ownerId))
      .where(eq(books.id, id))
      .limit(1);
    return rows[0] ?? null;
  } catch (error) {
    console.error("[daneshbook:query] getBookById failed:", (error as Error).message);
    return null;
  }
}

export type PlatformStats = {
  books: number;
  notes: number;
  students: number;
  universities: number;
  slides: number;
  exams: number;
  free: number;
  sell: number;
  wanted: number;
  konkur: number;
  suggestions: number;
  newSuggestions: number;
};

export async function getStats(): Promise<PlatformStats> {
  try {
    const [row] = await db
      .select({
        books: sql<number>`count(*) filter (where ${books.kind} = 'book')`,
        notes: sql<number>`count(*) filter (where ${books.kind} = 'note')`,
        slides: sql<number>`count(*) filter (where ${books.kind} = 'slide')`,
        exams: sql<number>`count(*) filter (where ${books.kind} = 'exam')`,
        free: sql<number>`count(*) filter (where ${books.offerType} = 'free')`,
        sell: sql<number>`count(*) filter (where ${books.offerType} = 'sell')`,
        wanted: sql<number>`count(*) filter (where ${books.offerType} = 'request')`,
        konkur: sql<number>`count(*) filter (where ${books.audience} = 'konkur')`,
        owners: sql<number>`count(distinct ${books.ownerId})`,
        universities: sql<number>`count(distinct ${books.university})`,
      })
      .from(books);
    const [studentRow] = await db.select({ total: sql<number>`count(*)` }).from(users);
    const [sugRow] = await db
      .select({
        total: sql<number>`count(*)`,
        fresh: sql<number>`count(*) filter (where ${suggestions.status} = 'new')`,
      })
      .from(suggestions);
    return {
      books: Number(row?.books ?? 0),
      notes: Number(row?.notes ?? 0),
      students: Number(studentRow?.total ?? 0),
      universities: Number(row?.universities ?? 0),
      slides: Number(row?.slides ?? 0),
      exams: Number(row?.exams ?? 0),
      free: Number(row?.free ?? 0),
      sell: Number(row?.sell ?? 0),
      wanted: Number(row?.wanted ?? 0),
      konkur: Number(row?.konkur ?? 0),
      suggestions: Number(sugRow?.total ?? 0),
      newSuggestions: Number(sugRow?.fresh ?? 0),
    };
  } catch (error) {
    console.error("[daneshbook:query] getStats failed:", (error as Error).message);
    return {
      books: 0,
      notes: 0,
      students: 0,
      universities: 0,
      slides: 0,
      exams: 0,
      free: 0,
      sell: 0,
      wanted: 0,
      konkur: 0,
      suggestions: 0,
      newSuggestions: 0,
    };
  }
}

export async function listBooksByOwner(ownerId: number): Promise<BookCardData[]> {
  try {
    return await db
      .select(bookSelection)
      .from(books)
      .innerJoin(users, eq(users.id, books.ownerId))
      .where(eq(books.ownerId, ownerId))
      .orderBy(desc(books.createdAt));
  } catch (error) {
    console.error("[daneshbook:query] listBooksByOwner failed:", (error as Error).message);
    return [];
  }
}

export type RequestRow = {
  id: number;
  bookId: number;
  bookTitle: string;
  bookEmoji: string;
  kind: string;
  message: string | null;
  status: string;
  createdAt: Date;
  counterpartName: string;
  counterpartEmoji: string;
  direction: "incoming" | "outgoing";
};

export async function listUserRequests(userId: number): Promise<RequestRow[]> {
  try {
    const base = db
      .select({
        id: requests.id,
        bookId: requests.bookId,
        bookTitle: books.title,
        bookEmoji: books.coverEmoji,
        kind: requests.kind,
        message: requests.message,
        status: requests.status,
        createdAt: requests.createdAt,
        ownerId: requests.ownerId,
        ownerIdName: users.fullName,
        ownerIdEmoji: users.avatarEmoji,
        requesterId: requests.userId,
      })
      .from(requests)
      .innerJoin(books, eq(books.id, requests.bookId));

    const incoming = await base
      .innerJoin(users, eq(users.id, requests.userId))
      .where(eq(requests.ownerId, userId))
      .orderBy(desc(requests.createdAt))
      .limit(30);

    const outgoing = await db
      .select({
        id: requests.id,
        bookId: requests.bookId,
        bookTitle: books.title,
        bookEmoji: books.coverEmoji,
        kind: requests.kind,
        message: requests.message,
        status: requests.status,
        createdAt: requests.createdAt,
        ownerName: users.fullName,
        ownerEmoji: users.avatarEmoji,
      })
      .from(requests)
      .innerJoin(books, eq(books.id, requests.bookId))
      .innerJoin(users, eq(users.id, requests.ownerId))
      .where(and(eq(requests.userId, userId), ne(requests.ownerId, userId)))
      .orderBy(desc(requests.createdAt))
      .limit(30);

    return [
      ...incoming.map((row) => ({
        id: row.id,
        bookId: row.bookId,
        bookTitle: row.bookTitle,
        bookEmoji: row.bookEmoji,
        kind: row.kind,
        message: row.message,
        status: row.status,
        createdAt: row.createdAt,
        counterpartName: row.ownerIdName,
        counterpartEmoji: row.ownerIdEmoji,
        direction: "incoming" as const,
      })),
      ...outgoing.map((row) => ({
        id: row.id,
        bookId: row.bookId,
        bookTitle: row.bookTitle,
        bookEmoji: row.bookEmoji,
        kind: row.kind,
        message: row.message,
        status: row.status,
        createdAt: row.createdAt,
        counterpartName: row.ownerName,
        counterpartEmoji: row.ownerEmoji,
        direction: "outgoing" as const,
      })),
    ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  } catch (error) {
    console.error("[daneshbook:query] listUserRequests failed:", (error as Error).message);
    return [];
  }
}

/* ----------------------------- suggestions ------------------------------ */

export type SuggestionRow = {
  id: number;
  fullName: string;
  contact: string;
  subject: string;
  message: string;
  status: string;
  adminNote: string | null;
  createdAt: Date;
};

export async function listSuggestions(): Promise<SuggestionRow[]> {
  try {
    return await db
      .select({
        id: suggestions.id,
        fullName: suggestions.fullName,
        contact: suggestions.contact,
        subject: suggestions.subject,
        message: suggestions.message,
        status: suggestions.status,
        adminNote: suggestions.adminNote,
        createdAt: suggestions.createdAt,
      })
      .from(suggestions)
      .orderBy(desc(suggestions.createdAt))
      .limit(100);
  } catch (error) {
    console.error("[daneshbook:query] listSuggestions failed:", (error as Error).message);
    return [];
  }
}

/* -------------------------------- admin --------------------------------- */

export type AdminUserRow = {
  id: number;
  fullName: string;
  email: string;
  university: string | null;
  major: string | null;
  karmaPoints: number;
  role: string;
  avatarEmoji: string;
  createdAt: Date;
  bookCount: number;
};

export async function listUsersForAdmin(): Promise<AdminUserRow[]> {
  try {
    return await db
      .select({
        id: users.id,
        fullName: users.fullName,
        email: users.email,
        university: users.university,
        major: users.major,
        karmaPoints: users.karmaPoints,
        role: users.role,
        avatarEmoji: users.avatarEmoji,
        createdAt: users.createdAt,
        bookCount: sql<number>`count(${books.id})`,
      })
      .from(users)
      .leftJoin(books, eq(books.ownerId, users.id))
      .groupBy(users.id)
      .orderBy(desc(users.createdAt))
      .limit(50);
  } catch (error) {
    console.error("[daneshbook:query] listUsersForAdmin failed:", (error as Error).message);
    return [];
  }
}

export async function bumpViews(id: number): Promise<void> {
  try {
    await db
      .update(books)
      .set({ views: sql`${books.views} + 1` })
      .where(eq(books.id, id));
  } catch {
    /* view counting must never break the page */
  }
}

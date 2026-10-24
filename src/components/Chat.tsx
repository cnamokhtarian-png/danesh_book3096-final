"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/Icon";
import { apiFetch } from "@/lib/api-client";

export type ChatMessage = {
  id: number;
  senderId: number;
  senderName: string;
  body: string;
  createdAt: string | Date;
};

type ChatData = {
  conversation: { id: number; bookId: number; bookTitle: string; partnerName: string; partnerEmoji: string };
  messages: ChatMessage[];
};

export function ChatLauncher({
  bookId,
  bookTitle,
  isLoggedIn,
  currentUserId,
}: {
  bookId: number;
  bookTitle: string;
  isLoggedIn: boolean;
  currentUserId?: number;
}) {
  const [open, setOpen] = useState(false);
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);

  async function startChat() {
    if (!isLoggedIn) {
      window.location.href = `/login?next=${encodeURIComponent(`/books/${bookId}`)}`;
      return;
    }
    setOpen(true);
    setError("");
    if (conversationId || creating) return;
    setCreating(true);
    const result = await apiFetch<{ conversationId: number }>("/api/chats", {
      method: "POST",
      body: { bookId },
    });
    setCreating(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setConversationId(result.data.conversationId);
  }

  return (
    <>
      <button
        type="button"
        onClick={startChat}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-l from-emerald-600 to-green-500 px-4 py-3 text-[13px] font-extrabold text-white shadow-lg shadow-emerald-500/25 transition hover:-translate-y-0.5 hover:from-emerald-700 hover:to-green-600 hover:shadow-emerald-500/35"
      >
        <span className="grid size-7 place-items-center rounded-full bg-white/15">
          <Icon name="message" className="size-4.5" />
        </span>
        گفتگو با آگهی‌دهنده
      </button>
      {open && (
        <ChatWindow
          conversationId={conversationId}
          title={bookTitle}
          loading={!conversationId && !error}
          error={error}
          onClose={() => setOpen(false)}
          onRetry={startChat}
          currentUserId={currentUserId}
        />
      )}
    </>
  );
}

export function ChatWindow({
  conversationId,
  title,
  loading = false,
  error = "",
  onClose,
  onRetry,
  currentUserId,
  embedded = false,
}: {
  conversationId: number | null;
  title: string;
  loading?: boolean;
  error?: string;
  onClose: () => void;
  onRetry?: () => void;
  currentUserId?: number;
  embedded?: boolean;
}) {
  const [chat, setChat] = useState<ChatData | null>(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [sendError, setSendError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const refresh = useCallback(async () => {
    if (!conversationId) return;
    const result = await apiFetch<ChatData>(`/api/chats/${conversationId}`);
    if (result.ok) setChat(result.data);
  }, [conversationId]);

  useEffect(() => {
    if (!conversationId) return;
    const firstLoad = window.setTimeout(() => void refresh(), 0);
    const timer = window.setInterval(() => void refresh(), 4000);
    return () => {
      window.clearTimeout(firstLoad);
      window.clearInterval(timer);
    };
  }, [conversationId, refresh]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [chat?.messages.length]);

  async function send(event: React.FormEvent) {
    event.preventDefault();
    const message = text.trim();
    if (!conversationId || !message || busy) return;
    setBusy(true);
    setSendError("");
    const result = await apiFetch(`/api/chats/${conversationId}`, { method: "POST", body: { message } });
    setBusy(false);
    if (!result.ok) {
      setSendError(result.message);
      return;
    }
    setText("");
    await refresh();
    inputRef.current?.focus();
  }

  return (
    <section
      role="dialog"
      aria-label={`گفتگو درباره ${title}`}
      className={embedded ? "relative flex h-full w-full flex-col overflow-hidden rounded-[1.6rem] border border-ink-100 bg-white shadow-sm" : "fixed inset-x-3 bottom-3 z-[70] flex h-[min(600px,calc(100dvh-24px))] flex-col overflow-hidden rounded-[1.6rem] border border-ink-100 bg-white shadow-[0_24px_80px_rgba(25,23,64,.25)] sm:inset-x-auto sm:bottom-5 sm:left-5 sm:w-[390px]"}
      dir="rtl"
    >
      <header className="flex items-center gap-3 bg-gradient-to-l from-brand-700 to-brand-500 px-4 py-3.5 text-white">
        <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-white/15 text-xl">
          {chat?.conversation.partnerEmoji ?? "💬"}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-extrabold">{chat?.conversation.partnerName ?? "گفتگو با آگهی‌دهنده"}</p>
          <p className="mt-0.5 truncate text-[11px] text-white/75">{chat?.conversation.bookTitle ?? title}</p>
        </div>
        <button type="button" onClick={onClose} className="grid size-9 place-items-center rounded-xl text-white/80 transition hover:bg-white/15 hover:text-white" aria-label="بستن گفتگو">
          <Icon name="x" className="size-4.5" />
        </button>
      </header>

      <div className="flex min-h-0 flex-1 flex-col bg-[#f7f8fc]">
        <div className="border-b border-ink-100 bg-white px-4 py-2 text-center text-[10.5px] text-ink-400">
          گفتگو درباره آگهی «{chat?.conversation.bookTitle ?? title}»
        </div>
        <div className="no-scrollbar flex-1 space-y-3 overflow-y-auto px-3.5 py-4">
          {loading && !conversationId && (
            <div className="m-auto rounded-2xl bg-white px-4 py-3 text-center text-xs text-ink-400 shadow-sm">در حال آماده‌سازی گفتگوی امن…</div>
          )}
          {error && !conversationId && (
            <div className="m-auto max-w-[290px] rounded-2xl border border-rose-100 bg-white p-4 text-center">
              <p className="text-xs leading-6 text-rose-600">{error}</p>
              {onRetry && <button onClick={onRetry} className="mt-2 text-xs font-bold text-brand-600">تلاش دوباره</button>}
            </div>
          )}
          {conversationId && !chat && <p className="py-8 text-center text-xs text-ink-400">در حال دریافت پیام‌ها…</p>}
          {chat?.messages.length === 0 && (
            <div className="mx-auto my-8 max-w-[250px] rounded-2xl border border-brand-100 bg-white p-4 text-center shadow-sm">
              <span className="text-2xl">👋</span>
              <p className="mt-2 text-xs font-extrabold text-ink-800">شروع یک گفتگوی دوستانه</p>
              <p className="mt-1 text-[11px] leading-5 text-ink-400">درباره وضعیت کتاب، قیمت یا نحوه دریافت سؤال کنید.</p>
            </div>
          )}
          {chat?.messages.map((message) => {
            const mine = currentUserId !== undefined && message.senderId === currentUserId;
            return (
              <div key={message.id} className={`flex ${mine ? "justify-start" : "justify-end"}`}>
                <div className={`max-w-[84%] rounded-2xl px-3.5 py-2.5 shadow-sm ${mine ? "rounded-tr-sm bg-brand-600 text-white" : "rounded-tl-sm border border-ink-100 bg-white text-ink-800"}`}>
                  <p className="whitespace-pre-wrap break-words text-[12.5px] leading-6">{message.body}</p>
                  <time className={`mt-1 block text-left text-[9px] ${mine ? "text-white/65" : "text-ink-400"}`}>
                    {new Intl.DateTimeFormat("fa-IR", { hour: "2-digit", minute: "2-digit" }).format(new Date(message.createdAt))}
                  </time>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>
        {sendError && <p className="px-4 pb-1 text-[10.5px] text-rose-600">{sendError}</p>}
        <form onSubmit={send} className="border-t border-ink-100 bg-white p-3">
          <div className="flex items-end gap-2 rounded-2xl border border-ink-100 bg-ink-50/70 p-1.5 focus-within:border-brand-300 focus-within:bg-white">
            <textarea
              ref={inputRef}
              value={text}
              onChange={(event) => setText(event.target.value.slice(0, 1000))}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void send(event); }
              }}
              rows={1}
              maxLength={1000}
              placeholder="پیامتان را بنویسید…"
              className="max-h-24 min-h-10 flex-1 resize-y bg-transparent px-2 py-2 text-[12.5px] leading-5 text-ink-900 outline-none placeholder:text-ink-400"
              aria-label="متن پیام"
            />
            <button type="submit" disabled={!text.trim() || busy || !conversationId} className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-600 text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-40" aria-label="ارسال پیام">
              <Icon name={busy ? "clock" : "send"} className="size-4.5" />
            </button>
          </div>
          <div className="mt-1 flex items-center justify-between px-1 text-[9px] text-ink-400">
            <span>Enter برای ارسال · Shift+Enter برای خط جدید</span><span>{text.length}/1000</span>
          </div>
        </form>
      </div>
    </section>
  );
}

export function ChatInbox({ currentUserId }: { currentUserId: number }) {
  const [items, setItems] = useState<Array<{ id: number; bookId: number; bookTitle: string; partnerName: string; partnerEmoji: string; direction: string; updatedAt: string; latestMessage: string }>>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    apiFetch<{ items: typeof items }>("/api/chats").then((result) => {
      if (!active) return;
      if (result.ok) setItems(result.data.items);
      else setError(result.message);
      setLoading(false);
    });
    return () => { active = false; };
  }, []);

  if (selected !== null) {
    const item = items.find((conversation) => conversation.id === selected);
    return (
      <div className="space-y-4">
        <button onClick={() => setSelected(null)} className="flex items-center gap-1.5 text-sm font-bold text-brand-600 hover:text-brand-700"><Icon name="back" className="size-4" /> بازگشت به گفتگوها</button>
        <div className="card-surface relative h-[min(680px,75dvh)] min-h-[430px] overflow-hidden">
          <ChatWindow conversationId={selected} title={item?.bookTitle ?? "گفتگو"} currentUserId={currentUserId} onClose={() => setSelected(null)} embedded />
        </div>
      </div>
    );
  }

  return (
    <section className="card-surface overflow-hidden">
      {loading ? <div className="p-10 text-center text-sm text-ink-400">در حال بارگذاری گفتگوها…</div> : error ? <div className="p-8 text-center text-sm text-rose-600">{error}</div> : items.length === 0 ? (
        <div className="p-10 text-center">
          <span className="mx-auto grid size-16 place-items-center rounded-3xl bg-brand-50 text-brand-600"><Icon name="message" className="size-7" /></span>
          <h2 className="mt-4 text-base font-extrabold text-ink-900">هنوز گفتگویی ندارید</h2>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-7 text-ink-400">در صفحه هر آگهی روی «گفتگو با آگهی‌دهنده» بزنید تا گفتگوی خصوصی‌تان اینجا ثبت شود.</p>
          <Link href="/books" className="mt-5 inline-flex rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-brand-700">دیدن آگهی‌ها</Link>
        </div>
      ) : (
        <div className="divide-y divide-ink-100">
          {items.map((item) => (
            <button key={item.id} type="button" onClick={() => setSelected(item.id)} className="flex w-full items-center gap-3 p-4 text-right transition hover:bg-brand-50/50 sm:p-5">
              <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-brand-50 text-xl">{item.partnerEmoji}</span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-extrabold text-ink-900">{item.partnerName}</span>
                  <time className="shrink-0 text-[10px] text-ink-400">{new Intl.DateTimeFormat("fa-IR", { month: "short", day: "numeric" }).format(new Date(item.updatedAt))}</time>
                </span>
                <span className="mt-1 block truncate text-[11px] font-bold text-brand-600">{item.bookTitle}</span>
                <span className="mt-1 block truncate text-[11.5px] text-ink-400">{item.latestMessage}</span>
              </span>
              <Icon name="back" className="size-4 shrink-0 text-ink-300" />
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

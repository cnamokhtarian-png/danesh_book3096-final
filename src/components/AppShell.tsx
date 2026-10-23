"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { Icon, type IconName } from "@/components/Icon";
import { apiFetch } from "@/lib/api-client";
import { faNumber, MANAGEMENT_EMAIL, NAV_GROUPS, MOBILE_TABS } from "@/lib/constants";

export type ShellUser = {
  id: number;
  fullName: string;
  avatarEmoji: string;
  karmaPoints: number;
  isAdmin: boolean;
} | null;

function basePath(href: string) {
  return href.split("?")[0];
}

function isActive(pathname: string, href: string) {
  const base = basePath(href);
  if (base === "/") return pathname === "/";
  return pathname === base || pathname.startsWith(`${base}/`);
}

/* ------------------------------- brand mark ------------------------------- */

function Brand({ showText = true }: { showText?: boolean }) {
  return (
    <Link href="/" className="group flex items-center gap-2.5" aria-label="دانش‌بوک">
      <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-brand-500 via-brand-600 to-accent-500 text-white shadow-lg shadow-brand-500/30 transition-transform group-hover:scale-105">
        <Icon name="grad" className="size-5.5" />
      </span>
      {showText && (
        <span className="leading-tight">
          <span className="block text-lg font-extrabold tracking-tight text-ink-900">دانش‌بوک</span>
          <span className="block text-[10.5px] font-medium text-ink-400">
            کتاب، جزوه و فایل دانشجویی
          </span>
        </span>
      )}
    </Link>
  );
}

/* ------------------------------ search field ------------------------------ */

function SearchField({ className = "" }: { className?: string }) {
  const router = useRouter();
  const [value, setValue] = useState("");

  return (
    <form
      className={`relative ${className}`}
      role="search"
      onSubmit={(event) => {
        event.preventDefault();
        const q = value.trim();
        router.push(q ? `/books?q=${encodeURIComponent(q)}` : "/books");
      }}
    >
      <Icon
        name="search"
        className="pointer-events-none absolute inset-y-0 right-3.5 my-auto size-4.5 text-ink-400"
      />
      <input
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="جستجو در کتاب، جزوه، اسلاید و نمونه سوال…"
        className="w-full rounded-2xl border border-ink-100 bg-white/90 py-2.5 pr-11 pl-4 text-sm text-ink-900 shadow-sm outline-none transition placeholder:text-ink-400 focus:border-brand-400 focus:ring-4 focus:ring-brand-500/12"
      />
    </form>
  );
}

/* -------------------------------- nav list ------------------------------- */

function NavLinkItem({
  item,
  pathname,
  onNavigate,
}: {
  item: { href: string; label: string; icon: IconName; badge?: string };
  pathname: string;
  onNavigate?: () => void;
}) {
  const active = isActive(pathname, item.href);
  const isVip = item.badge === "VIP";

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      title={item.label}
      className={`group relative flex items-center gap-2.5 rounded-2xl px-3 py-2.5 text-[13px] font-semibold transition ${
        active
          ? isVip
            ? "bg-[#f3ecff] text-[#5b21b6]"
            : "bg-brand-50 text-brand-700"
          : isVip
            ? "text-[#6d28d9] hover:bg-[#f6f1ff]"
            : "text-ink-600 hover:bg-ink-50 hover:text-ink-900"
      }`}
    >
      <Icon name={item.icon} className="size-5 shrink-0" />
      <span className="truncate lg:block">{item.label}</span>
      {item.badge && (
        <span className="ms-auto hidden rounded-full bg-gradient-to-l from-[#7c3aed] to-[#c026d3] px-2 py-0.5 text-[9.5px] font-black text-white lg:block">
          {item.badge}
        </span>
      )}
    </Link>
  );
}

function NavBody({
  pathname,
  user,
  onNavigate,
}: {
  pathname: string;
  user: ShellUser;
  onNavigate?: () => void;
}) {
  return (
    <nav className="no-scrollbar flex-1 space-y-4 overflow-y-auto px-3 py-4">
      {NAV_GROUPS.map((group) => {
        const items = group.items.filter((item) => {
          if (item.adminOnly) return Boolean(user?.isAdmin);
          if (item.authOnly) return Boolean(user);
          return true;
        });
        if (!items.length) return null;
        return (
          <div key={group.title}>
            <p className="mb-1.5 flex items-center gap-1.5 px-3 text-[10.5px] font-black tracking-wide text-ink-400/80 uppercase lg:block">
              <Icon name={group.icon as IconName} className="size-3.5 lg:hidden" />
              <span className="hidden lg:block">{group.title}</span>
            </p>
            <div className="space-y-0.5">
              {items.map((item) => (
                <NavLinkItem
                  key={item.href}
                  item={item}
                  pathname={pathname}
                  onNavigate={onNavigate}
                />
              ))}
            </div>
          </div>
        );
      })}
    </nav>
  );
}

/* ------------------------------ logout button ----------------------------- */

function LogoutButton({ className = "" }: { className?: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  return (
    <button
      type="button"
      disabled={pending}
      onClick={async () => {
        setPending(true);
        await apiFetch("/api/auth/logout", { method: "POST" });
        setPending(false);
        router.push("/");
        router.refresh();
      }}
      className={`grid size-10 place-items-center rounded-2xl text-ink-400 transition hover:bg-rose-50 hover:text-rose-500 disabled:opacity-50 ${className}`}
      title="خروج از حساب"
      aria-label="خروج از حساب"
    >
      <Icon name="logout" className="size-5" />
    </button>
  );
}

function UserBlock({ user }: { user: NonNullable<ShellUser> }) {
  return (
    <div className="border-t border-ink-100 p-3">
      <Link
        href="/profile"
        className="flex items-center gap-2.5 rounded-2xl p-2 transition hover:bg-ink-50"
      >
        <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-brand-50 text-xl">
          {user.avatarEmoji}
        </span>
        <span className="hidden min-w-0 flex-1 lg:block">
          <span className="block truncate text-[13px] font-extrabold text-ink-900">
            {user.fullName}
          </span>
          <span className="mt-0.5 flex items-center gap-1 text-[11px] font-bold text-amber-600">
            <Icon name="flame" className="size-3" />
            {faNumber(user.karmaPoints)} امتیاز کارما
          </span>
        </span>
      </Link>
      <div className="flex items-center gap-2 px-1 pt-1">
        {user.isAdmin && (
          <Link
            href="/admin"
            className="flex flex-1 items-center justify-center gap-1.5 rounded-2xl bg-ink-900 px-3 py-2 text-[11.5px] font-bold text-white transition hover:bg-brand-700"
          >
            <Icon name="shield" className="size-4" />
            <span className="hidden lg:inline">پنل مدیریت</span>
          </Link>
        )}
        <LogoutButton />
      </div>
    </div>
  );
}

function GuestBlock() {
  return (
    <div className="space-y-2 border-t border-ink-100 p-3">
      <Link
        href="/login"
        className="flex items-center justify-center gap-1.5 rounded-2xl border border-ink-100 px-3 py-2.5 text-[12.5px] font-bold text-ink-700 transition hover:border-brand-200 hover:text-brand-700"
      >
        <Icon name="login" className="size-4" />
        ورود
      </Link>
      <Link
        href="/register"
        className="flex items-center justify-center gap-1.5 rounded-2xl bg-gradient-to-l from-brand-600 to-brand-500 px-3 py-2.5 text-[12.5px] font-bold text-white shadow-lg shadow-brand-500/25"
      >
        <Icon name="sparkles" className="size-4" />
        ثبت‌نام رایگان
      </Link>
    </div>
  );
}

/* --------------------------------- shell --------------------------------- */

export default function AppShell({ user, children }: { user: ShellUser; children: React.ReactNode }) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const closeDrawer = () => setDrawerOpen(false);

  return (
    <div className="min-h-dvh">
      {/* ============================ SIDEBAR ============================ */}
      <aside className="fixed inset-y-0 right-0 z-40 hidden w-[86px] flex-col border-l border-ink-100 bg-white/85 backdrop-blur-xl md:flex lg:w-64">
        <div className="flex h-16 items-center justify-center border-b border-ink-100 px-3 lg:justify-start lg:px-4">
          <Brand showText />
        </div>

        <NavBody pathname={pathname} user={user} />

        {user ? <UserBlock user={user} /> : <GuestBlock />}
      </aside>

      {/* ============================ TOP BAR ============================ */}
      <header className="sticky top-0 z-30 border-b border-ink-100/80 bg-white/80 backdrop-blur-xl md:pr-[86px] lg:pr-64">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 sm:px-6">
          <div className="md:hidden">
            <Brand />
          </div>

          <div className="hidden md:block">
            <SearchField className="w-64 lg:w-80" />
          </div>

          <div className="ms-auto flex items-center gap-2">
            <Link
              href="/konkur"
              className="hidden items-center gap-1.5 rounded-2xl bg-gradient-to-l from-[#5b21b6] via-[#7c3aed] to-[#a21caf] px-3.5 py-2 text-[12.5px] font-bold text-white shadow-lg shadow-[#7c3aed]/25 transition hover:-translate-y-0.5 sm:flex"
            >
              <Icon name="crown" className="size-4" />
              کنکور VIP
            </Link>
            <Link
              href="/dashboard/new"
              className="flex items-center gap-1.5 rounded-2xl bg-gradient-to-l from-brand-600 to-brand-500 px-3.5 py-2 text-[12.5px] font-bold text-white shadow-lg shadow-brand-500/25 transition hover:-translate-y-0.5"
            >
              <Icon name="plus" className="size-4" />
              <span className="hidden sm:inline">ثبت آگهی</span>
            </Link>
            <Link
              href="/support"
              className="grid size-10 place-items-center rounded-2xl border border-ink-100 text-ink-500 transition hover:border-brand-200 hover:text-brand-700"
              title="پیشنهادات و پشتیبانی"
            >
              <Icon name="headset" className="size-5" />
            </Link>
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className="grid size-10 place-items-center rounded-2xl border border-ink-100 text-ink-600 md:hidden"
              aria-label="باز کردن منو"
            >
              <Icon name="dashboard" className="size-5" />
            </button>
          </div>
        </div>
      </header>

      {/* ============================ CONTENT ============================ */}
      <main className="md:pr-[86px] lg:pr-64">
        <div className="mx-auto max-w-6xl px-4 pb-28 pt-8 sm:px-6 md:pb-16">{children}</div>
      </main>

      {/* ======================= MOBILE DRAWER MENU ====================== */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            aria-label="بستن منو"
            onClick={closeDrawer}
            className="absolute inset-0 bg-ink-900/45 backdrop-blur-sm"
          />
          <div className="animate-pop absolute inset-y-0 right-0 flex w-[85%] max-w-xs flex-col bg-white shadow-2xl">
            <div className="flex h-16 items-center justify-between border-b border-ink-100 px-4">
              <Brand />
              <button
                type="button"
                onClick={closeDrawer}
                className="grid size-10 place-items-center rounded-2xl border border-ink-100 text-ink-500"
                aria-label="بستن منو"
              >
                <Icon name="x" className="size-5" />
              </button>
            </div>
            <NavBody pathname={pathname} user={user} onNavigate={closeDrawer} />
            {user ? <UserBlock user={user} /> : <GuestBlock />}
            <a
              href={`mailto:${MANAGEMENT_EMAIL}`}
              className="border-t border-ink-100 px-4 py-3 text-center text-[11px] font-bold text-ink-400"
              dir="ltr"
            >
              {MANAGEMENT_EMAIL}
            </a>
          </div>
        </div>
      )}

      {/* ======================= MOBILE BOTTOM TABS ====================== */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-ink-100 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden">
        <div className="flex items-stretch justify-around">
          {MOBILE_TABS.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-[10.5px] font-semibold transition ${
                  item.href === "/konkur"
                    ? active
                      ? "text-[#7c3aed]"
                      : "text-[#8b5cf6]"
                    : active
                      ? "text-brand-700"
                      : "text-ink-400"
                }`}
              >
                <Icon name={item.icon} className="size-5.5" />
                {item.label}
              </Link>
            );
          })}
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="flex flex-1 flex-col items-center gap-1 py-2.5 text-[10.5px] font-semibold text-ink-400"
          >
            <Icon name="dashboard" className="size-5.5" />
            منو
          </button>
        </div>
      </nav>
    </div>
  );
}

export { Brand, SearchField };

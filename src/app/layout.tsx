import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import AppShell from "@/components/AppShell";
import { getCurrentUser, isAdminUser } from "@/lib/auth";
import "./globals.css";

export const metadata: Metadata = {
  title: "دانش‌بوک | پلتفرم مبادله کتاب و جزوه دانشجویی",
  description:
    "دانش‌بوک بازار دانشجویی برای خرید، فروش، تبادل کتاب‌های دانشگاهی و دسترسی رایگان به جزوه‌های درسی است.",
  applicationName: "دانش‌بوک",
};

export const viewport: Viewport = {
  themeColor: "#5b4de0",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();

  return (
    <html lang="fa" dir="rtl">
      <body className="bg-ink-50 text-ink-900 antialiased">
        <AppShell
          user={
            user
              ? {
                  id: user.id,
                  fullName: user.fullName,
                  avatarEmoji: user.avatarEmoji,
                  karmaPoints: user.karmaPoints,
                  isAdmin: isAdminUser(user),
                }
              : null
          }
        >
          {children}
        </AppShell>
      </body>
    </html>
  );
}

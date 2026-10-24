import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import AppShell from "@/components/AppShell";
import { getCurrentUser, isAdminUser } from "@/lib/auth";
import { SITE } from "@/lib/site";
import "./globals.css";

export const metadata: Metadata = {
  // پایه همه URLهای متادیتا (canonical، og:url، ...)
  metadataBase: new URL(SITE.url),
  title: {
    default: `${SITE.name} | ${SITE.shortDescription}`,
    // صفحه‌های داخلی فقط عنوان خودشان را بدهند؛ نام برند خودکار اضافه می‌شود
    template: `%s | ${SITE.name}`,
  },
  description: SITE.description,
  applicationName: SITE.name,
  keywords: [...SITE.keywords],
  authors: [{ name: SITE.name }],
  creator: SITE.name,
  publisher: SITE.name,
  category: "education",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: SITE.name,
    locale: SITE.locale,
    url: "/",
    title: `${SITE.name} | ${SITE.shortDescription}`,
    description: SITE.description,
    images: [
      {
        url: SITE.ogImage,
        width: 1200,
        height: 630,
        alt: `${SITE.name} — ${SITE.shortDescription}`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE.name} | ${SITE.shortDescription}`,
    description: SITE.description,
    images: [SITE.ogImage],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  // کد تأیید Search Console فقط با تنظیم متغیر محیطی فعال می‌شود
  ...(process.env.GOOGLE_SITE_VERIFICATION
    ? { verification: { google: process.env.GOOGLE_SITE_VERIFICATION } }
    : {}),
};

/**
 * همه صفحه‌ها در هر درخواست رندر می‌شوند.
 * دلیل: layout وضعیت نشست را از کوکی می‌خواند و با تغییر DATABASE_URL روی
 * هاست، هر صفحه‌ی کش‌شده‌ی قدیمی رفتار ناهماهنگ می‌داد (500 های پراکنده).
 */
export const dynamic = "force-dynamic";

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

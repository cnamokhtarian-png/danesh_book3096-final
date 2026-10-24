/**
 * ارسال ایمیل — بدون هیچ وابستگی خارجی.
 *
 * اگر `RESEND_API_KEY` تنظیم شده باشد، ایمیل از طریق API رسمی Resend ارسال
 * می‌شود (فقط fetch). در غیر این صورت لینک در لاگ سرور چاپ می‌شود تا توسعه
 * محلی و محیط‌های بدون سرویس ایمیل هم قابل استفاده باشند.
 *
 * اگر بعداً سرویس دیگری (Postmark، SES، SMTP) لازم شد، فقط همین فایل عوض
 * می‌شود و بقیه کد دست‌نخورده می‌ماند.
 */

type MailInput = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

function fromAddress(): string {
  return process.env.MAIL_FROM ?? "دانش‌بوک <no-reply@daneshbook.local>";
}

export type MailResult = { sent: boolean; reason?: string };

export async function sendMail({ to, subject, text, html }: MailInput): Promise<MailResult> {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    // توسعه محلی / نبود سرویس ایمیل
    console.warn(
      `[daneshbook:mail] سرویس ایمیل تنظیم نشده است (RESEND_API_KEY خالی). ایمیل «${subject}» برای ${to}:`,
    );
    console.warn(text);
    return { sent: false, reason: "mail-not-configured" };
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromAddress(),
        to: [to],
        subject,
        text,
        ...(html ? { html } : {}),
      }),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      console.error("[daneshbook:mail] ارسال ناموفق:", response.status, detail.slice(0, 300));
      return { sent: false, reason: `resend-${response.status}` };
    }
    return { sent: true };
  } catch (error) {
    console.error("[daneshbook:mail] خطای شبکه:", (error as Error).message);
    return { sent: false, reason: "network" };
  }
}

/** آدرس پایه سایت برای ساخت لینک‌های داخل ایمیل. */
export function siteUrl(request?: Request): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configured) return configured.replace(/\/$/, "");
  if (request) {
    const origin = request.headers.get("origin");
    if (origin) return origin.replace(/\/$/, "");
    const host = request.headers.get("host");
    if (host) {
      const proto = host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https";
      return `${proto}://${host}`;
    }
  }
  return "http://localhost:3000";
}

/* --------------------------- reset password mail -------------------------- */

export function resetMailContent(fullName: string, link: string, minutes: number) {
  const text = [
    `${fullName} عزیز،`,
    "",
    "برای تعیین رمز عبور جدید روی لینک زیر بزنید:",
    link,
    "",
    `این لینک تا ${minutes} دقیقه معتبر است و فقط یک بار قابل استفاده است.`,
    "اگر شما درخواست بازیابی رمز نداده‌اید، این ایمیل را نادیده بگیرید؛ رمز فعلی شما تغییر نمی‌کند.",
    "",
    "دانش‌بوک",
  ].join("\n");

  const html = `
  <div dir="rtl" style="font-family:Tahoma,Arial,sans-serif;line-height:1.9;color:#14162a">
    <p>${fullName} عزیز،</p>
    <p>برای تعیین رمز عبور جدید روی دکمه زیر بزنید:</p>
    <p style="margin:24px 0">
      <a href="${link}" style="background:#5b4de0;color:#fff;padding:12px 22px;border-radius:12px;text-decoration:none;font-weight:bold">
        تعیین رمز عبور جدید
      </a>
    </p>
    <p style="font-size:12px;color:#545a7a">اگر دکمه کار نکرد، این نشانی را در مرورگر باز کنید:<br/>
      <span dir="ltr">${link}</span>
    </p>
    <p style="font-size:12px;color:#545a7a">
      این لینک تا ${minutes} دقیقه معتبر است و فقط یک بار قابل استفاده است. اگر شما درخواست
      بازیابی رمز نداده‌اید، این ایمیل را نادیده بگیرید.
    </p>
  </div>`;

  return { text, html };
}

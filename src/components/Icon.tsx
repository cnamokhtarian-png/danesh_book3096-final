import type { SVGProps } from "react";

export type IconName =
  | "home"
  | "books"
  | "search"
  | "plus"
  | "dashboard"
  | "user"
  | "login"
  | "logout"
  | "sparkles"
  | "exchange"
  | "star"
  | "clock"
  | "mail"
  | "lock"
  | "id"
  | "grad"
  | "eye"
  | "eyeOff"
  | "chevron"
  | "alert"
  | "flame"
  | "check"
  | "x"
  | "trash"
  | "back"
  | "send"
  | "bolt"
  | "users"
  | "coin"
  | "bookmark"
  | "message"
  | "shield"
  | "filter"
  | "note"
  | "crown"
  | "presentation"
  | "exam"
  | "gift"
  | "headset"
  | "image"
  | "camera"
  | "inbox"
  | "phone"
  | "chart";

const ICONS: Record<IconName, React.ReactNode> = {
  home: <path d="M3 10.6 12 3.5l9 7.1V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />,
  books: (
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  dashboard: (
    <>
      <rect x="3" y="3" width="7" height="9" rx="1.6" />
      <rect x="14" y="3" width="7" height="5" rx="1.6" />
      <rect x="14" y="12" width="7" height="9" rx="1.6" />
      <rect x="3" y="16" width="7" height="5" rx="1.6" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4.5 21c0-3.9 3.4-6 7.5-6s7.5 2.1 7.5 6" />
    </>
  ),
  login: (
    <>
      <path d="M15 3h3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-3" />
      <path d="m10 17 5-5-5-5M15 12H3" />
    </>
  ),
  logout: (
    <>
      <path d="M9 21H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3" />
      <path d="m16 17 5-5-5-5M21 12H9" />
    </>
  ),
  sparkles: (
    <>
      <path d="m12 3 1.9 4.6 4.6 1.9-4.6 1.9L12 16l-1.9-4.6L5.5 9.5l4.6-1.9z" />
      <path d="m18.5 14.5.9 2.1 2.1.9-2.1.9-.9 2.1-.9-2.1-2.1-.9 2.1-.9z" />
    </>
  ),
  exchange: (
    <>
      <path d="m8 3-4 4 4 4" />
      <path d="M4 7h16" />
      <path d="m16 21 4-4-4-4" />
      <path d="M20 17H4" />
    </>
  ),
  star: <path d="m12 3.5 2.6 5.4 5.9.8-4.3 4.1 1.1 5.9-5.3-2.9-5.3 2.9 1.1-5.9L3.5 9.7l5.9-.8z" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.5V12l3 2" />
    </>
  ),
  mail: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2.5" />
      <path d="m3.5 7.5 8.5 6 8.5-6" />
    </>
  ),
  lock: (
    <>
      <rect x="4.5" y="10" width="15" height="10.5" rx="2.5" />
      <path d="M8 10V7.5a4 4 0 0 1 8 0V10" />
    </>
  ),
  id: (
    <>
      <rect x="2.5" y="5" width="19" height="14" rx="2.5" />
      <circle cx="8.5" cy="11" r="2" />
      <path d="M5.5 16c.6-1.4 1.7-2 3-2s2.4.6 3 2M14.5 10h4M14.5 14h3" />
    </>
  ),
  grad: (
    <>
      <path d="M22 9.5 12 4.5 2 9.5l10 5z" />
      <path d="M6.5 12v4.5c0 1.7 2.5 3 5.5 3s5.5-1.3 5.5-3V12" />
    </>
  ),
  eye: (
    <>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  chevron: <path d="m6 9 6 6 6-6" />,
  alert: (
    <>
      <path d="M12 3.5 2.8 19.5h18.4z" />
      <path d="M12 9.5v4.5" />
      <path d="M12 17.2h.01" />
    </>
  ),
  eyeOff: (
    <>
      <path d="M10.6 6.1A7.9 7.9 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a17 17 0 0 1-2.4 3.3" />
      <path d="M6.3 7.5A17.4 17.4 0 0 0 2.5 12S6 18.5 12 18.5a8.8 8.8 0 0 0 3.6-.8" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
      <path d="m3 3 18 18" />
    </>
  ),
  flame: (
    <path d="M12 2.5c1.8 3.8 6 5.2 6 9.7a6 6 0 0 1-12 0c0-2.6 1.6-4 2.7-5.8.6 1.4 1.5 2 2.4 2 .2-2.3-.4-4-1.1-5.9z" />
  ),
  check: <path d="m5 13 4.5 4.5L19.5 7" />,
  x: <path d="m6 6 12 12M18 6 6 18" />,
  trash: (
    <>
      <path d="M4 7h16" />
      <path d="M10 11v6M14 11v6" />
      <path d="m6 7 1 13h10l1-13" />
      <path d="M9.5 7V4.5h5V7" />
    </>
  ),
  back: <path d="M20 12H4m6-6-6 6 6 6" />,
  send: <path d="M21.5 3 11 13.5M21.5 3l-7 18.5-3.5-8-8-3.5z" />,
  bolt: <path d="M13.5 2.5 4.5 14h6l-1 7.5 9-11.5h-6z" />,
  users: (
    <>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20c0-3.5 3-5.5 6.5-5.5s6.5 2 6.5 5.5" />
      <path d="M16.5 5.2a3 3 0 0 1 0 5.8M18 20c0-2.1-.7-3.6-2-4.6" />
    </>
  ),
  coin: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v10M9.3 9.6h3.4a1.8 1.8 0 0 1 0 3.6H11a1.8 1.8 0 0 0 0 3.6h3.7" />
    </>
  ),
  bookmark: <path d="M7 3.5h10a1 1 0 0 1 1 1v16l-6-3.8-6 3.8v-16a1 1 0 0 1 1-1z" />,
  message: <path d="M21 11.5a8 8 0 0 1-8 8H8.5L4 22.5l1.2-4.3A8 8 0 1 1 21 11.5z" />,
  shield: <path d="M12 3l8 3v5.5c0 5-3.4 8.3-8 9.5-4.6-1.2-8-4.5-8-9.5V6z" />,
  filter: <path d="M3.5 5.5h17l-6.5 7.5v6l-4-2.2v-3.8z" />,
  note: (
    <>
      <path d="M6 3.5h9L19.5 8v12.5H6z" />
      <path d="M14.5 3.5V8h5M9 12.5h6M9 16h4" />
    </>
  ),
  crown: (
    <path d="M3 8.5l3.5 3L12 5l5.5 6.5 3.5-3-2 10.5H5z" />
  ),
  presentation: (
    <>
      <rect x="3" y="4" width="18" height="12" rx="2" />
      <path d="M12 16v4M8.5 20h7M7.5 9.5l3 3 3-3 3 3" />
    </>
  ),
  exam: (
    <>
      <path d="M6 3.5h9L19.5 8v12.5H6z" />
      <path d="M14.5 3.5V8h5M9 12h2.5M9 15.5h4" />
      <circle cx="16.5" cy="15.5" r="2.5" />
    </>
  ),
  gift: (
    <>
      <rect x="3" y="9" width="18" height="11.5" rx="2" />
      <path d="M3 13.5h18M12 9v11.5" />
      <path d="M12 9C10 9 7.5 8.5 7.5 6.5S10 4 12 6.5C14 4 16.5 4.5 16.5 6.5S14 9 12 9z" />
    </>
  ),
  headset: (
    <>
      <path d="M4 14v-2a8 8 0 0 1 16 0v2" />
      <path d="M4 14h2.5a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z" />
      <path d="M20 14h-2.5a1 1 0 0 0-1 1v3a1 1 0 0 0 1 1H19a1 1 0 0 0 1-1z" />
      <path d="M17 19v.5a2.5 2.5 0 0 1-2.5 2.5H12" />
    </>
  ),
  image: (
    <>
      <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14z" />
      <path d="M7 9l1.5 1.5L13 7l2 2 4-4 6 6z" />
    </>
  ),
  camera: (
    <>
      <path d="M14.5 4h-5L7 7H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-2z" />
      <circle cx="12" cy="9" r="3" />
    </>
  ),
  inbox: (
    <>
      <path d="M3.5 13.5 6 5h12l2.5 8.5V19a1 1 0 0 1-1 1H4.5a1 1 0 0 1-1-1z" />
      <path d="M3.5 13.5H9l1 2.5h4l1-2.5h5.5" />
    </>
  ),
  phone: (
    <path d="M6.5 3.5h3l1.5 4-2 1.5a11 11 0 0 0 5 5l1.5-2 4 1.5v3a2 2 0 0 1-2.2 2A15.5 15.5 0 0 1 4.5 5.7 2 2 0 0 1 6.5 3.5z" />
  ),
  chart: (
    <>
      <path d="M4 20V4M4 20h16" />
      <path d="M8 17v-5M12.5 17V8M17 17v-7" />
    </>
  ),
};

type IconProps = SVGProps<SVGSVGElement> & { name: IconName };

export function Icon({ name, className = "size-5", ...rest }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      {...rest}
    >
      {ICONS[name]}
    </svg>
  );
}

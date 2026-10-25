import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

const base = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

export function PawIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M12 13.4c2.7 0 5.2 1.6 5.2 3.6 0 1.7-1.4 2.6-3 2.4-1.5-.2-3-.2-4.4 0-1.6.2-3-.7-3-2.4 0-2 2.5-3.6 5.2-3.6Z" fill="currentColor" stroke="none" />
      <ellipse cx="6.4" cy="10.2" rx="1.9" ry="2.4" fill="currentColor" stroke="none" />
      <ellipse cx="10.2" cy="6.6" rx="1.9" ry="2.5" fill="currentColor" stroke="none" />
      <ellipse cx="15.2" cy="6.4" rx="1.9" ry="2.5" fill="currentColor" stroke="none" />
      <ellipse cx="18.6" cy="10" rx="1.9" ry="2.4" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function CatMark({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 44 44" className={className} aria-hidden="true">
      <rect width="44" height="44" rx="13" fill="#ff6b4a" />
      <rect x="0.5" y="0.5" width="43" height="43" rx="12.5" fill="none" stroke="rgba(255,255,255,0.24)" />
      <path
        d="M11.5 18.5 9.6 9.4l9.2 4.2c1.8-.6 3.8-.6 5.6 0l9-4.2-1.8 9.1c1.8 2 2.6 4.3 2.2 6.9-.7 5.6-5.4 9.1-11.8 9.1s-11.1-3.5-11.8-9.1c-.4-2.6.4-4.9 2.3-6.9Z"
        fill="#140c08"
      />
      <path d="M15.5 23.6c0-1.2.9-2 2-2s2 .8 2 2" stroke="#ff6b4a" strokeWidth="2.1" strokeLinecap="round" fill="none" />
      <path d="M24.5 23.6c0-1.2.9-2 2-2s2 .8 2 2" stroke="#ff6b4a" strokeWidth="2.1" strokeLinecap="round" fill="none" />
      <path d="m20.6 26.6 1.4 1 1.4-1" stroke="#ffb35c" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <path d="M13 27.5h4M27 27.5h4M20 29.5v2" stroke="rgba(255,107,74,0.55)" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

export function FishIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M15.8 8.2c-2.9 0-5.4 1.2-7 3.1-1.6 1.9-2.1 4.6-1.4 7.1.2.6.8 1 1.4 1 2.5 0 4.9-.9 6.7-2.5" />
      <path d="M15.8 8.2c2 .8 3.7 2.4 4.6 4.4.9 2 .9 4.2.1 6.2L15.8 8.2v10.6" />
      <path d="M8.8 18.7c-1.1.5-2.4 1.4-3.3 2.6-.6.8-1.1 1.7-1.3 2.6 1.5 0 3.1-.7 4.3-1.6" />
      <path d="M4.2 23.9h4.6" />
      <circle cx="14.2" cy="12.4" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function SparkIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M13.2 2.8 14.9 9l6.3 1.8-6.3 1.7-1.7 6.3-1.8-6.3L5.1 10.8 11.4 9l1.8-6.2Z" />
      <path d="m5.6 16.4.8 2.8 2.8.8-2.8.8-.8 2.8-.8-2.8-2.8-.8 2.8-.8.8-2.8ZM19.4 15.2l.6 2 2 .6-2 .6-.6 2-.6-2-2-.6 2-.6.6-2Z" />
    </svg>
  );
}

export function TrophyIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M8 4h8v5a4 4 0 0 1-8 0V4Z" />
      <path d="M8 5H5.2a.8.8 0 0 0-.8.9c.1 2.6 1.4 4.3 3.9 4.8M16 5h2.8c.5 0 .9.4.8.9-.1 2.6-1.4 4.3-3.9 4.8" />
      <path d="M12 13v4M8.5 20.5h7M10 20.5l.5-3.5h3l.5 3.5" />
    </svg>
  );
}

export function PlayIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M7 4.8c0-1 1.1-1.6 1.9-1.1l10.4 6.7c.8.5.8 1.7 0 2.2L8.9 19.3c-.8.5-1.9-.1-1.9-1.1V4.8Z" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function PauseIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="6" y="4" width="4" height="16" rx="1.4" fill="currentColor" stroke="none" />
      <rect x="14" y="4" width="4" height="16" rx="1.4" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function RestartIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M4.5 10.5A7.5 7.5 0 1 1 5 15.8" />
      <path d="M3.5 5v5.5H9" />
    </svg>
  );
}

export function ArrowRightIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M4 12h15M13.5 6l6 6-6 6" />
    </svg>
  );
}

export function ArrowUpIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M12 20V5M6 11l6-6 6 6" />
    </svg>
  );
}

export function ArrowDownIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M12 4v15M6 13l6 6 6-6" />
    </svg>
  );
}

export function SoundOnIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M11 5 6.8 8.5H3.5v7h3.3L11 19V5Z" fill="currentColor" stroke="none" />
      <path d="M14.8 8.6a5 5 0 0 1 0 6.8M17.6 6a8.5 8.5 0 0 1 0 12" />
    </svg>
  );
}

export function SoundOffIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M11 5 6.8 8.5H3.5v7h3.3L11 19V5Z" fill="currentColor" stroke="none" />
      <path d="m15 9.5 5 5M20 9.5l-5 5" />
    </svg>
  );
}

export function HelpIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9a2.5 2.5 0 1 1 3.7 2.2c-.8.4-1.2 1-1.2 1.9v.3" />
      <circle cx="12" cy="17" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function CloseIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="m6 6 12 12M18 6 6 18" />
    </svg>
  );
}

export function ShieldIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M12 3.2 19 6v5.2c0 4.2-2.9 7.6-7 9.6-4.1-2-7-5.4-7-9.6V6l7-2.8Z" />
      <path d="m9 12 2 2 4-4.2" />
    </svg>
  );
}

export function BellIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M18 8.5a6 6 0 1 0-12 0c0 5-2 6-2 6h16s-2-1-2-6Z" />
      <path d="M10 19a2.2 2.2 0 0 0 4 0" />
    </svg>
  );
}

export function YarnIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="11.5" cy="11.5" r="7.5" />
      <path d="M6.5 5.8c1.6 2.7 4 5 6.8 6.5 1.9 1 3.9 1.4 5.9 1.4M5.5 14.5c3.2.4 6.3-.2 9-1.8 1.5-.9 2.8-2.1 3.8-3.6" />
      <path d="M17.5 18.5c1.4.5 2.2 1.5 2.5 2.5" />
    </svg>
  );
}

export function StarIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="m12 3 2.6 5.6L20.5 9l-4.2 4.2 1 6.2-5.3-3-5.3 3 1-6.2L3.5 9l5.9-.4L12 3Z" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function KeyboardIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="2.5" y="6" width="19" height="12" rx="2.4" />
      <path d="M6 10h.01M9.3 10h.01M12.6 10h.01M16 10h.01M19 10h.01M6 13.4h.01M9.3 13.4h.01M12.6 13.4h.01M16 13.4h.01M19 13.4h.01M8 16.4h8" />
    </svg>
  );
}

export function SwipeIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M9 11V5.8a1.8 1.8 0 0 1 3.6 0V11" />
      <path d="M12.6 10.6V8.4a1.7 1.7 0 0 1 3.4 0v2.8" />
      <path d="M16 11.2V10a1.7 1.7 0 0 1 3.4 0v4.4A6 6 0 0 1 13.5 20h-.7a6 6 0 0 1-4.8-2.4L4.4 13a1.7 1.7 0 0 1 2.6-2.2L9.4 13" />
    </svg>
  );
}

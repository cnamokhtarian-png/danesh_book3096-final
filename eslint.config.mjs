import { defineConfig, globalIgnores } from "eslint/config";
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";

export default defineConfig([
  // Keep the starter on the flat config export that actually runs under the pinned ESLint/Next toolchain.
  ...nextCoreWebVitals,
  // polished-cat-street-game یک اپ Vite مستقل است (بازی) و با ابزار خودش
  // بیلد میشود؛ قوانین مخصوص Next مثل no-html-link-for-pages نباید روی آن اعمال شوند.
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "dist/**",
    "next-env.d.ts",
    "polished-cat-street-game/**",
  ]),
]);

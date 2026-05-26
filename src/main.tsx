import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// ---------------------------------------------------------------------------
// Required environment variable guard
// If any of these are missing the app will silently break in hard-to-debug
// ways (blank Stripe form, failed auth, etc.).  Fail loudly instead.
// ---------------------------------------------------------------------------
const REQUIRED_ENV_VARS: Array<keyof ImportMetaEnv> = [
  "VITE_SUPABASE_URL",
  "VITE_SUPABASE_PUBLISHABLE_KEY",
  "VITE_STRIPE_PUBLISHABLE_KEY",
];

const missing = REQUIRED_ENV_VARS.filter((key) => !import.meta.env[key]);

if (missing.length > 0) {
  const msg = `[MGB Portal] Missing required environment variables:\n  ${missing.join("\n  ")}\n\nAdd them to your .env file (local) and to Vercel → Settings → Environment Variables (production).`;
  console.error(msg);

  // In development: throw so the Vite error overlay is impossible to miss.
  // In production: log the warning but let the app render — it will show its
  // own errors for missing config rather than a blank/broken page.
  if (import.meta.env.DEV) {
    throw new Error(msg);
  }
}

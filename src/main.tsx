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
  // In production: render a plain error page so the blank white screen gets
  // an actionable message instead.
  if (import.meta.env.DEV) {
    throw new Error(msg);
  } else {
    document.getElementById("root")!.innerHTML = `
      <div style="font-family:sans-serif;padding:40px;max-width:600px;margin:auto">
        <h2 style="color:#b91c1c">Configuration Error</h2>
        <p>The app is missing required environment variables. Please contact the site administrator.</p>
        <pre style="background:#fef2f2;padding:16px;border-radius:8px;font-size:13px;overflow:auto">${missing.join("\n")}</pre>
      </div>`;
  }
}

// ─── API Configuration ──────────────────────────────────────────────
// Reads from VITE_API_URL env variable.
//   • .env            → http://localhost:5000       (dev)
// • .env.production → https://codegpt-jfvt...    (build)

export const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000";

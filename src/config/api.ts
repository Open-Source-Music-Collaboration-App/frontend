const configuredApiUrl = import.meta.env.VITE_API_URL?.replace(/\/$/, "");

// Local development keeps the Express API on localhost. Hosted builds use a
// same-origin API so auth cookies and API requests stay on the deployed site.
const hostname =
  window.location.hostname === "127.0.0.1"
    ? "localhost"
    : window.location.hostname;

export const apiUrl = configuredApiUrl || (import.meta.env.DEV ? `http://${hostname}:3333` : "");

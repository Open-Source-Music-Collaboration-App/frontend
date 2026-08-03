const configuredApiUrl = import.meta.env.VITE_API_URL?.replace(/\/$/, "");

// Prefer localhost over 127.0.0.1 so session cookies match the backend OAuth host.
const hostname =
  window.location.hostname === "127.0.0.1"
    ? "localhost"
    : window.location.hostname;

export const apiUrl = configuredApiUrl || `http://${hostname}:3333`;

import { microgreensEnvironment } from "./microgreens.js";

const defaultFrontendOrigins = [
  "http://localhost:3000",
  "https://green-sprout-store.vercel.app",
  "https://micro-greens.foodieai.in",
];

export function allowedFrontendOrigins(
  value = process.env.ALLOWED_FRONTEND_ORIGINS,
) {
  const origins = value
    ?.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  const microgreens = process.env.SERVICE_MODE === "microgreens";
  const defaults = microgreens
    ? microgreensEnvironment() === "test"
      ? ["https://test.microgreenskart.in"]
      : [
          ...defaultFrontendOrigins,
          "https://microgreenskart.in",
          "https://www.microgreenskart.in",
        ]
    : defaultFrontendOrigins;
  return [...new Set([...defaults, ...(origins || [])])].filter((origin) => {
    if (origin === "*" || origin === "null") return false;
    try {
      const url = new URL(origin);
      if (url.origin !== origin) return false;
      if (microgreens && process.env.NODE_ENV === "production")
        return (
          url.protocol === "https:" &&
          !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)
        );
      return ["http:", "https:"].includes(url.protocol);
    } catch {
      return false;
    }
  });
}

export function isAllowedFrontendOrigin(origin) {
  return !origin || allowedFrontendOrigins().includes(origin);
}

export const corsOptions = {
  origin(origin, callback) {
    callback(null, isAllowedFrontendOrigin(origin));
  },
  credentials: true,
};

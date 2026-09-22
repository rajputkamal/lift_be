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
  return [...new Set([...defaultFrontendOrigins, ...(origins || [])])];
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

import { randomBytes, createHash, timingSafeEqual } from "node:crypto";
import { fail } from "../catalogue.js";
import { isAllowedFrontendOrigin } from "../../config/cors.js";

const cookieName = "grower_guest";
export const hash = (value) => createHash("sha256").update(value).digest("hex");
export function parseCookie(req) {
  const entry = (req.headers.cookie || "")
    .split(";")
    .map((s) => s.trim())
    .find((s) => s.startsWith(`${cookieName}=`));
  const token = entry?.slice(cookieName.length + 1);
  return token && /^[a-f0-9]{64}$/.test(token) ? token : null;
}
export function guestForCreate(req, res) {
  const existing = parseCookie(req);
  if (existing) return hash(existing);
  const token = randomBytes(32).toString("hex");
  const origin = req.get?.("origin") || req.headers.origin;
  const crossSite =
    process.env.GUEST_COOKIE_CROSS_SITE === "true" ||
    origin?.startsWith("https://");
  const secure = process.env.NODE_ENV === "production" || crossSite;
  const sameSite = crossSite ? "None" : "Lax";
  res.append(
    "Set-Cookie",
    `${cookieName}=${token}; HttpOnly; Path=/api/grower-checkout/v1; Max-Age=2592000; SameSite=${sameSite}${secure ? "; Secure" : ""}`,
  );
  return hash(token);
}
export function requireGuest(req, res, next) {
  const token = parseCookie(req);
  if (!token)
    return fail(
      res,
      401,
      "GUEST_SESSION_REQUIRED",
      "Guest session cookie is required.",
    );
  req.guestHash = hash(token);
  return next();
}
export function checkGuestOrigin(req, res, next) {
  const origin = req.get("origin");
  if (!isAllowedFrontendOrigin(origin))
    return fail(res, 403, "FORBIDDEN", "Origin is not allowed.");
  if (req.get("sec-fetch-site") === "cross-site" && !origin)
    return fail(res, 403, "FORBIDDEN", "Cross-site request denied.");
  return next();
}

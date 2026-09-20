import mongoose from "mongoose";
import Grower from "./models/growerModel.js";
import Product from "./models/productModel.js";

const reserved = new Set([
  "api",
  "admin",
  "cart",
  "checkout",
  "growers",
  "products",
  "orders",
  "order-confirmation",
  "grower-dashboard",
  "info",
]);
const growerFields = {
  name: 100,
  slug: 100,
  logo: 2048,
  coverImage: 2048,
  shortDescription: 240,
  description: 5000,
  city: 100,
  area: 100,
  pincode: 6,
  phone: 15,
  email: 254,
  deliveryText: 500,
  pickupDetails: 500,
};
const productFields = {
  name: 120,
  slug: 120,
  shortDescription: 240,
  description: 5000,
  weight: 50,
  category: 100,
  storage: 500,
};
const growerKeys = new Set([
  ...Object.keys(growerFields),
  "deliveryFee",
  "deliveryPincodes",
  "isActive",
]);
const productKeys = new Set([
  ...Object.keys(productFields),
  "growerId",
  "price",
  "images",
  "cultivationDate",
  "harvestDate",
  "bestBefore",
  "stock",
  "isActive",
]);
const requiredGrower = [
  "name",
  "slug",
  "shortDescription",
  "description",
  "city",
  "area",
  "pincode",
  "phone",
  "email",
];
const requiredProduct = [
  "growerId",
  "name",
  "slug",
  "shortDescription",
  "description",
  "price",
  "weight",
  "category",
  "storage",
  "stock",
];
const dateKeys = ["cultivationDate", "harvestDate", "bestBefore"];

export const idValid = (id) =>
  typeof id === "string" &&
  /^[a-f\d]{24}$/i.test(id) &&
  mongoose.isValidObjectId(id);
export const fail = (res, status, code, message, fields) =>
  res.status(status).json({
    success: false,
    error: { code, message, ...(fields && { fields }) },
  });
export const missing = (res) =>
  fail(res, 404, "NOT_FOUND", "Record not found.");
export const conflict = (res) =>
  fail(res, 409, "DUPLICATE_SLUG", "Slug is already in use.");
export const serverError = (res, err) => {
  console.error("Catalogue error type:", err?.name || "unknown");
  return fail(res, 500, "INTERNAL_ERROR", "Internal server error.");
};
export const isDuplicate = (err) => err?.code === 11000;
export const pageQuery = (query) => {
  const parse = (value, fallback) =>
    value === undefined
      ? fallback
      : /^[1-9]\d*$/.test(String(value))
        ? Number(value)
        : NaN;
  const page = parse(query.page, 1),
    limit = parse(query.limit, 12);
  const skip = (page - 1) * limit;
  return Number.isSafeInteger(page) &&
    Number.isSafeInteger(limit) &&
    limit <= 100 &&
    Number.isSafeInteger(skip)
    ? { page, limit, skip }
    : null;
};
export const pagination = (page, limit, total) => ({
  page,
  limit,
  total,
  totalPages: Math.ceil(total / limit),
});
export const searchFilter = (value, fields) => {
  if (value === undefined || value === "") return {};
  const escaped = String(value)
    .slice(0, 100)
    .replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return {
    $or: fields.map((field) => ({
      [field]: { $regex: escaped, $options: "i" },
    })),
  };
};
export const exactTextFilter = (value) => ({
  $regex: `^${String(value)
    .slice(0, 100)
    .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
  $options: "i",
});
export const activeFilter = (value) =>
  value === undefined
    ? {}
    : value === "true"
      ? { isActive: true }
      : value === "false"
        ? { isActive: false }
        : null;

const validDate = (s) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(`${s}T00:00:00.000Z`);
  return !Number.isNaN(d.valueOf()) && d.toISOString().slice(0, 10) === s;
};
const url = (s) => {
  try {
    const u = new URL(s);
    return (
      ["http:", "https:"].includes(u.protocol) && !!u.hostname && !/\s/.test(s)
    );
  } catch {
    return false;
  }
};
const priceToPaise = (value) => {
  const s = String(value);
  if (!/^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/.test(s)) return null;
  const [rupees, fraction = ""] = s.split(".");
  const paise = Number(rupees) * 100 + Number(fraction.padEnd(2, "0"));
  return Number.isSafeInteger(paise) && paise > 0 ? paise : null;
};

export function validate(kind, body, current = null) {
  const keys = kind === "grower" ? growerKeys : productKeys;
  const lengths = kind === "grower" ? growerFields : productFields;
  const required = kind === "grower" ? requiredGrower : requiredProduct;
  const errors = {},
    out = {};
  if (!body || typeof body !== "object" || Array.isArray(body))
    return { errors: { body: "A JSON object is required." } };
  if (current && !Object.keys(body).length)
    errors.body = "At least one field is required.";
  for (const [key, raw] of Object.entries(body)) {
    if (!keys.has(key)) {
      errors[key] = "Unknown field.";
      continue;
    }
    if (key === "growerId") {
      if (current) errors[key] = "Grower cannot be changed.";
      else if (!idValid(raw)) errors[key] = "Valid growerId is required.";
      else out[key] = raw;
    } else if (key === "price") {
      const paise = priceToPaise(raw);
      if (typeof raw !== "number" || paise === null)
        errors[key] = "Price must be positive with at most two decimal places.";
      else out.pricePaise = paise;
    } else if (key === "deliveryFee") {
      const paise = priceToPaise(raw);
      if (typeof raw !== "number" || (raw !== 0 && paise === null))
        errors[key] =
          "Delivery fee must be non-negative with at most two decimal places.";
      else out.deliveryFeePaise = raw === 0 ? 0 : paise;
    } else if (key === "deliveryPincodes") {
      if (
        !Array.isArray(raw) ||
        raw.length > 100 ||
        raw.some((p) => typeof p !== "string" || !/^[1-9]\d{5}$/.test(p))
      )
        errors[key] = "Use up to 100 six-digit pincodes.";
      else out.deliveryPincodes = [...new Set(raw)];
    } else if (key === "stock") {
      if (!Number.isSafeInteger(raw) || raw < 0)
        errors[key] = "Stock must be a non-negative integer.";
      else out[key] = raw;
    } else if (key === "isActive") {
      if (typeof raw !== "boolean") errors[key] = "Must be true or false.";
      else out[key] = raw;
    } else if (key === "images") {
      if (
        !Array.isArray(raw) ||
        raw.length > 8 ||
        raw.some((v) => typeof v !== "string" || !url(v))
      )
        errors[key] = "Use up to eight HTTP(S) image URLs.";
      else out[key] = raw;
    } else if (dateKeys.includes(key)) {
      if (raw !== null && (typeof raw !== "string" || !validDate(raw)))
        errors[key] = "Use a real date in YYYY-MM-DD format or null.";
      else out[key] = raw;
    } else if (key === "logo" || key === "coverImage") {
      if (
        raw !== null &&
        (typeof raw !== "string" || raw.length > lengths[key] || !url(raw))
      )
        errors[key] = "Use an HTTP(S) image URL or null.";
      else out[key] = raw;
    } else if (typeof raw !== "string" || raw.trim().length > lengths[key]) {
      errors[key] = `Must be text of at most ${lengths[key]} characters.`;
    } else {
      const value = raw.trim();
      if (!["deliveryText", "pickupDetails"].includes(key) && !value)
        errors[key] = "This field is required.";
      else if (key === "slug") {
        const slug = value
          .toLowerCase()
          .normalize("NFKD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "");
        if (!slug || (kind === "grower" && reserved.has(slug)))
          errors[key] = "Slug is invalid or reserved.";
        else out[key] = slug;
      } else out[key] = value;
    }
  }
  if (!current)
    for (const key of required)
      if (!(key in body)) errors[key] = `${key} is required.`;
  const merged = { ...current, ...out };
  if (kind === "grower") {
    if (merged.pincode && !/^[1-9]\d{5}$/.test(merged.pincode))
      errors.pincode = "Use a six-digit Indian pincode.";
    if (merged.phone && !/^(?:\+91[ -]?)?[6-9]\d{9}$/.test(merged.phone))
      errors.phone = "Use a valid Indian mobile number.";
    if (merged.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(merged.email))
      errors.email = "Use a valid email address.";
  } else {
    if (
      merged.isActive &&
      (!Array.isArray(merged.images) || merged.images.length < 1)
    )
      errors.images = "An active product needs 1–8 images.";
    const [cultivation, harvest, best] = dateKeys.map((k) => merged[k]);
    if (cultivation && harvest && cultivation > harvest)
      errors.harvestDate = "Must be on or after cultivationDate.";
    if (harvest && best && harvest > best)
      errors.bestBefore = "Must be on or after harvestDate.";
    if (cultivation && best && cultivation > best)
      errors.bestBefore = "Must be on or after cultivationDate.";
  }
  return { errors, value: out };
}

const iso = (v) => v?.toISOString?.() ?? null;
export const publicGrower = (g) => ({
  id: String(g._id),
  name: g.name,
  slug: g.slug,
  logo: g.logo ?? null,
  coverImage: g.coverImage ?? null,
  shortDescription: g.shortDescription,
  description: g.description,
  city: g.city,
  area: g.area,
  rating: null,
  deliveryText: g.deliveryText || "",
  isActive: g.isActive,
});
export const crudGrower = (g) => ({
  ...publicGrower(g),
  deliveryFee: (g.deliveryFeePaise ?? 0) / 100,
  deliveryPincodes: g.deliveryPincodes ?? [],
  pickupDetails: g.pickupDetails ?? "",
  createdAt: iso(g.createdAt),
  updatedAt: iso(g.updatedAt),
});
export const publicProduct = (p) => ({
  id: String(p._id),
  growerId: String(p.growerId),
  name: p.name,
  slug: p.slug,
  shortDescription: p.shortDescription,
  description: p.description,
  price: p.pricePaise / 100,
  weight: p.weight,
  thumbnail: p.images?.[0] ?? null,
  images: p.images ?? [],
  category: p.category,
  cultivationDate: p.cultivationDate ?? null,
  harvestDate: p.harvestDate ?? null,
  bestBefore: p.bestBefore ?? null,
  storage: p.storage,
  stock: p.stock,
  isActive: p.isActive,
});
export const crudProduct = (p) => ({
  ...publicProduct(p),
  createdAt: iso(p.createdAt),
  updatedAt: iso(p.updatedAt),
});
export { Grower, Product };

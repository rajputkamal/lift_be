import { Readable } from "node:stream";
import { v2 as cloudinary } from "cloudinary";
import multer from "multer";
import { fail } from "./catalogue.js";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const acceptedTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_IMAGE_BYTES, files: 8, fields: 40 },
  fileFilter: (_req, file, callback) => {
    callback(
      acceptedTypes.has(file.mimetype)
        ? null
        : new multer.MulterError("LIMIT_UNEXPECTED_FILE", file.fieldname),
      acceptedTypes.has(file.mimetype),
    );
  },
});

const growerFiles = upload.fields([
  { name: "logo", maxCount: 1 },
  { name: "coverImage", maxCount: 1 },
]);
const productFiles = upload.fields([{ name: "images", maxCount: 8 }]);

function configureCloudinary() {
  const value = process.env.CLOUDINARY_URL;
  if (!value) throw new Error("CLOUDINARY_URL is missing");
  const parsed = new URL(value);
  if (
    parsed.protocol !== "cloudinary:" ||
    !parsed.username ||
    !parsed.password ||
    !parsed.hostname
  ) {
    throw new Error("CLOUDINARY_URL is invalid");
  }
  cloudinary.config({
    cloud_name: parsed.hostname,
    api_key: decodeURIComponent(parsed.username),
    api_secret: decodeURIComponent(parsed.password),
    secure: true,
  });
}

function uploadBuffer(file, folder) {
  configureCloudinary();
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: "image",
        use_filename: true,
        unique_filename: true,
        overwrite: false,
      },
      (error, result) => {
        if (error) return reject(error);
        return resolve({
          url: result.secure_url,
          publicId: result.public_id,
        });
      },
    );
    Readable.from(file.buffer).pipe(stream);
  });
}

export async function cleanupCloudinaryUploads(req) {
  const ids = req.cloudinaryPublicIds || [];
  if (!ids.length || !process.env.CLOUDINARY_URL) return;
  configureCloudinary();
  await Promise.allSettled(
    ids.map((publicId) =>
      cloudinary.uploader.destroy(publicId, {
        resource_type: "image",
        invalidate: true,
      }),
    ),
  );
  req.cloudinaryPublicIds = [];
}

function parseJsonArray(value, field) {
  if (Array.isArray(value)) return value;
  if (typeof value !== "string") return value;
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) throw new Error();
    return parsed;
  } catch {
    const error = new Error(`${field} must be a JSON array.`);
    error.field = field;
    throw error;
  }
}

function normalizeMultipartBody(req, kind) {
  if (req.body.isActive !== undefined) {
    if (!["true", "false"].includes(req.body.isActive)) {
      const error = new Error("isActive must be true or false.");
      error.field = "isActive";
      throw error;
    }
    req.body.isActive = req.body.isActive === "true";
  }
  if (kind === "grower") {
    if (req.body.deliveryFee !== undefined)
      req.body.deliveryFee = Number(req.body.deliveryFee);
    if (req.body.deliveryPincodes !== undefined)
      req.body.deliveryPincodes = parseJsonArray(
        req.body.deliveryPincodes,
        "deliveryPincodes",
      );
  } else {
    if (req.body.price !== undefined) req.body.price = Number(req.body.price);
    if (req.body.stock !== undefined) req.body.stock = Number(req.body.stock);
    if (req.body.images !== undefined)
      req.body.images = parseJsonArray(req.body.images, "images");
    for (const key of ["cultivationDate", "harvestDate", "bestBefore"])
      if (req.body[key] === "null" || req.body[key] === "")
        req.body[key] = null;
  }
}

function multerResult(middleware, req, res) {
  return new Promise((resolve, reject) => {
    middleware(req, res, (error) => (error ? reject(error) : resolve()));
  });
}

function uploadMiddleware(kind) {
  return async (req, res, next) => {
    if (!req.is("multipart/form-data")) return next();
    req.cloudinaryPublicIds = [];
    try {
      await multerResult(
        kind === "grower" ? growerFiles : productFiles,
        req,
        res,
      );
      normalizeMultipartBody(req, kind);

      const files = req.files || {};
      const count = Object.values(files).reduce(
        (total, group) => total + group.length,
        0,
      );
      if (count && !process.env.CLOUDINARY_URL) {
        return fail(
          res,
          503,
          "IMAGE_UPLOAD_NOT_CONFIGURED",
          "Image upload is not configured.",
        );
      }

      if (kind === "grower") {
        for (const field of ["logo", "coverImage"]) {
          if (files[field]?.[0] && req.body[field]) {
            return fail(
              res,
              400,
              "VALIDATION_ERROR",
              "Please check the submitted fields.",
              { [field]: "Send either an image file or URL, not both." },
            );
          }
        }
        for (const field of ["logo", "coverImage"]) {
          if (!files[field]?.[0]) continue;
          const uploaded = await uploadBuffer(files[field][0], "lift/growers");
          req.cloudinaryPublicIds.push(uploaded.publicId);
          req.body[field] = uploaded.url;
        }
      } else if (files.images?.length) {
        if (req.body.images?.length) {
          return fail(
            res,
            400,
            "VALIDATION_ERROR",
            "Please check the submitted fields.",
            { images: "Send either image files or image URLs, not both." },
          );
        }
        const uploaded = [];
        for (const file of files.images) {
          const image = await uploadBuffer(file, "lift/products");
          req.cloudinaryPublicIds.push(image.publicId);
          uploaded.push(image.url);
        }
        req.body.images = uploaded;
      }
      return next();
    } catch (error) {
      await cleanupCloudinaryUploads(req);
      if (error instanceof multer.MulterError) {
        const message =
          error.code === "LIMIT_FILE_SIZE"
            ? "Each image must be 5 MB or smaller."
            : "Use up to eight JPEG, PNG, WebP, or AVIF images.";
        return fail(res, 400, "IMAGE_UPLOAD_ERROR", message);
      }
      if (error.field) {
        return fail(
          res,
          400,
          "VALIDATION_ERROR",
          "Please check the submitted fields.",
          { [error.field]: error.message },
        );
      }
      console.error("Cloudinary upload failed:", error?.name || "unknown");
      return fail(res, 502, "IMAGE_UPLOAD_FAILED", "Image upload failed.");
    }
  };
}

export const uploadGrowerImages = uploadMiddleware("grower");
export const uploadProductImages = uploadMiddleware("product");

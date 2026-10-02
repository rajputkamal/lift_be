import express from "express";
import { fail } from "./catalogue.js";
import {
  createGrower,
  listGrowers,
  getGrower,
  updateGrower,
  deleteGrower,
  createProduct,
  listProducts,
  getProduct,
  updateProduct,
  deleteProduct,
} from "./crudController.js";
import { uploadGrowerImages, uploadProductImages } from "./cloudinaryUpload.js";

const router = express.Router();
function catalogueWriteAccess(req, res, next) {
  if (req.app.locals.catalogueWritesEnabled === false)
    return fail(
      res,
      403,
      "CATALOGUE_WRITES_DISABLED",
      "Catalogue writes are disabled on this service.",
    );
  return next();
}
router.post("/growers", catalogueWriteAccess, uploadGrowerImages, createGrower);
router.get("/growers", listGrowers);
router.get("/growers/:id", getGrower);
router.patch("/growers/:id", catalogueWriteAccess, updateGrower);
router.delete("/growers/:id", catalogueWriteAccess, deleteGrower);
router.post(
  "/products",
  catalogueWriteAccess,
  uploadProductImages,
  createProduct,
);
router.get("/products", listProducts);
router.get("/products/:id", getProduct);
router.patch("/products/:id", catalogueWriteAccess, updateProduct);
router.delete("/products/:id", catalogueWriteAccess, deleteProduct);
export default router;

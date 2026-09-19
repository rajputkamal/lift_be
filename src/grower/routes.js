import express from "express";
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

const router = express.Router();
router.post("/growers", createGrower);
router.get("/growers", listGrowers);
router.get("/growers/:id", getGrower);
router.patch("/growers/:id", updateGrower);
router.delete("/growers/:id", deleteGrower);
router.post("/products", createProduct);
router.get("/products", listProducts);
router.get("/products/:id", getProduct);
router.patch("/products/:id", updateProduct);
router.delete("/products/:id", deleteProduct);
export default router;

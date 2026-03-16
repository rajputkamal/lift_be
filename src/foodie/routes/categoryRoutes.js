import express from "express";

import {
  createCategory,
  getAllCategories,
  updateCategory,
  deleteCategory,
} from "../controllers/categoryController.js";

const router = express.Router();

// Admin
router.post("/v1/admin/categories", createCategory);
router.patch("/v1/admin/categories/:id", updateCategory);
router.delete("/v1/admin/categories/:id", deleteCategory);

// Public / Admin / Owner
router.get("/v1/categories", getAllCategories);

export default router;

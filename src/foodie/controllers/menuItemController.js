import MenuItem from "../models/menuItemModel.js";
import Restaurant from "../models/restaurantModel.js";
import Category from "../models/categoryModel.js";

export const createMenuItem = async (req, res) => {
  try {
    const { restaurantId, categoryId, name, description, price, vegType } =
      req.body;

    const restaurant = await Restaurant.findById({_id: restaurantId});
    if (!restaurant) {
      return res.status(404).json({ message: "Restaurant not found" });
    }

    const category = await Category.findById({_id: categoryId});
    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    const menuItem = await MenuItem.create({
      restaurantId,
      categoryId,
      name,
      description,
      price,
      vegType,
      isAvailable: true,
    });

    res.status(201).json({
      id: menuItem._id,
      message: "Menu item created",
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

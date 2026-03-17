import MenuItem from "../models/menuItemModel.js";
import Restaurant from "../models/restaurantModel.js";
import Category from "../models/categoryModel.js";

export const createMenuItem = async (req, res) => {
  try {
    const { restaurantId, categoryId, name, description, price, vegType } =
      req.body;

    const restaurant = await Restaurant.findById({ _id: restaurantId });
    if (!restaurant) {
      return res.status(404).json({ message: "Restaurant not found" });
    }

    const category = await Category.findById({ _id: categoryId });
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
      tags: [
        name.toLowerCase(),
        ...(description ? description.toLowerCase().split(" ") : []),
      ],
    });

    res.status(201).json({
      id: menuItem._id,
      message: "Menu item created",
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const searchMenuItems = async (req, res) => {
  try {
    const { restaurantId, q } = req.query;

    if (!restaurantId || !q) {
      return res.status(400).json({
        message: "restaurantId and search query (q) are required",
      });
    }

    const normalizedQuery = q.replace(/\s+/g, "").toLowerCase();

    const items = await MenuItem.find({
      restaurantId,
      isAvailable: true,
      $or: [
        { name: { $regex: q, $options: "i" } },

        {
          $expr: {
            $regexMatch: {
              input: {
                $replaceAll: {
                  input: { $toLower: "$name" },
                  find: " ",
                  replacement: "",
                },
              },
              regex: normalizedQuery,
            },
          },
        },

        { description: { $regex: q, $options: "i" } },

        { tags: { $in: [q.toLowerCase()] } },
      ],
    })
      .populate("categoryId", "name")
      .limit(20);

    return res.status(200).json({
      message: "Search results",
      count: items.length,
      data: items,
    });
  } catch (err) {
    console.error("Search error:", err);

    res.status(500).json({
      message: "Failed to search menu items",
    });
  }
};

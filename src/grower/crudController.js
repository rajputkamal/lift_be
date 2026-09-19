import {
  Grower,
  Product,
  validate,
  fail,
  missing,
  conflict,
  serverError,
  isDuplicate,
  pageQuery,
  pagination,
  searchFilter,
  activeFilter,
  crudGrower,
  crudProduct,
  idValid,
} from "./catalogue.js";
import DayReservation from "./models/dayReservationModel.js";
import { transaction } from "./checkout/reservations.js";
import { cleanupCloudinaryUploads } from "./cloudinaryUpload.js";

const validation = (res, fields) =>
  fail(
    res,
    400,
    "VALIDATION_ERROR",
    "Please check the submitted fields.",
    fields,
  );
const checkedPage = (req, res) => {
  const pg = pageQuery(req.query);
  if (!pg)
    validation(res, {
      pagination:
        "page and limit must be positive integers; limit must be at most 100.",
    });
  return pg;
};
const checkedFilter = (req, res) => {
  const filter = activeFilter(req.query.isActive);
  if (filter === null) validation(res, { isActive: "Use true or false." });
  return filter;
};

export async function createGrower(req, res) {
  const { errors, value } = validate("grower", req.body);
  if (Object.keys(errors).length) {
    await cleanupCloudinaryUploads(req);
    return validation(res, errors);
  }
  try {
    return res
      .status(201)
      .json({ success: true, data: crudGrower(await Grower.create(value)) });
  } catch (err) {
    await cleanupCloudinaryUploads(req);
    return isDuplicate(err) ? conflict(res) : serverError(res, err);
  }
}
export async function listGrowers(req, res) {
  const pg = checkedPage(req, res);
  if (!pg) return;
  const active = checkedFilter(req, res);
  if (active === null) return;
  try {
    const filter = {
      ...active,
      ...searchFilter(req.query.search, ["name", "slug", "city", "area"]),
    };
    const [rows, total] = await Promise.all([
      Grower.find(filter)
        .sort({ name: 1, _id: 1 })
        .skip(pg.skip)
        .limit(pg.limit)
        .lean(),
      Grower.countDocuments(filter),
    ]);
    return res.json({
      success: true,
      data: rows.map(crudGrower),
      pagination: pagination(pg.page, pg.limit, total),
    });
  } catch (err) {
    return serverError(res, err);
  }
}
export async function getGrower(req, res) {
  if (!idValid(req.params.id)) return missing(res);
  try {
    const row = await Grower.findById(req.params.id).lean();
    return row
      ? res.json({ success: true, data: crudGrower(row) })
      : missing(res);
  } catch (err) {
    return serverError(res, err);
  }
}
export async function updateGrower(req, res) {
  if (!idValid(req.params.id)) return missing(res);
  try {
    const row = await Grower.findById(req.params.id).lean();
    if (!row) return missing(res);
    const { errors, value } = validate("grower", req.body, row);
    if (Object.keys(errors).length) return validation(res, errors);
    const updated = await Grower.findByIdAndUpdate(
      row._id,
      { $set: value },
      { new: true, runValidators: true },
    );
    return res.json({ success: true, data: crudGrower(updated) });
  } catch (err) {
    return isDuplicate(err) ? conflict(res) : serverError(res, err);
  }
}
export async function deleteGrower(req, res) {
  if (!idValid(req.params.id)) return missing(res);
  try {
    const row = await Grower.findByIdAndUpdate(
      req.params.id,
      { $set: { isActive: false } },
      { new: true },
    );
    return row
      ? res.json({
          success: true,
          data: { id: String(row._id), isActive: false },
        })
      : missing(res);
  } catch (err) {
    return serverError(res, err);
  }
}

export async function createProduct(req, res) {
  const { errors, value } = validate("product", req.body);
  if (Object.keys(errors).length) {
    await cleanupCloudinaryUploads(req);
    return validation(res, errors);
  }
  try {
    if (!(await Grower.exists({ _id: value.growerId }))) {
      await cleanupCloudinaryUploads(req);
      return validation(res, { growerId: "Grower does not exist." });
    }
    return res
      .status(201)
      .json({ success: true, data: crudProduct(await Product.create(value)) });
  } catch (err) {
    await cleanupCloudinaryUploads(req);
    return isDuplicate(err) ? conflict(res) : serverError(res, err);
  }
}
export async function listProducts(req, res) {
  const pg = checkedPage(req, res);
  if (!pg) return;
  const active = checkedFilter(req, res);
  if (active === null) return;
  if (req.query.growerId && !idValid(req.query.growerId))
    return validation(res, { growerId: "Valid growerId is required." });
  try {
    const filter = {
      ...active,
      ...searchFilter(req.query.search, ["name", "slug", "category"]),
    };
    if (req.query.growerId) filter.growerId = req.query.growerId;
    const [rows, total] = await Promise.all([
      Product.find(filter)
        .sort({ name: 1, _id: 1 })
        .skip(pg.skip)
        .limit(pg.limit)
        .lean(),
      Product.countDocuments(filter),
    ]);
    return res.json({
      success: true,
      data: rows.map(crudProduct),
      pagination: pagination(pg.page, pg.limit, total),
    });
  } catch (err) {
    return serverError(res, err);
  }
}
export async function getProduct(req, res) {
  if (!idValid(req.params.id)) return missing(res);
  try {
    const row = await Product.findById(req.params.id).lean();
    return row
      ? res.json({ success: true, data: crudProduct(row) })
      : missing(res);
  } catch (err) {
    return serverError(res, err);
  }
}
export async function updateProduct(req, res) {
  if (!idValid(req.params.id)) return missing(res);
  try {
    const row = await Product.findById(req.params.id).lean();
    if (!row) return missing(res);
    const { errors, value } = validate("product", req.body, row);
    if (Object.keys(errors).length) return validation(res, errors);
    let updated;
    if (value.stock !== undefined) {
      updated = await transaction(async (session) => {
        const overbooked = await DayReservation.findOne({
          productId: row._id,
          date: { $gte: new Date().toISOString().slice(0, 10) },
          reserved: { $gt: value.stock },
        })
          .session(session)
          .lean();
        if (overbooked) return null;
        return Product.findByIdAndUpdate(
          row._id,
          { $set: value },
          { new: true, runValidators: true, session },
        );
      });
      if (!updated)
        return fail(
          res,
          409,
          "STOCK_CONFLICT",
          "Stock cannot be lower than reserved capacity.",
        );
    } else
      updated = await Product.findByIdAndUpdate(
        row._id,
        { $set: value },
        { new: true, runValidators: true },
      );
    return res.json({ success: true, data: crudProduct(updated) });
  } catch (err) {
    return isDuplicate(err) ? conflict(res) : serverError(res, err);
  }
}
export async function deleteProduct(req, res) {
  if (!idValid(req.params.id)) return missing(res);
  try {
    const row = await Product.findByIdAndUpdate(
      req.params.id,
      { $set: { isActive: false } },
      { new: true },
    );
    return row
      ? res.json({
          success: true,
          data: { id: String(row._id), isActive: false },
        })
      : missing(res);
  } catch (err) {
    return serverError(res, err);
  }
}

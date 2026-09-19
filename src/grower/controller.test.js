import test from "node:test";
import assert from "node:assert/strict";
import { Grower, Product } from "./catalogue.js";
import {
  createGrower,
  createProduct,
  updateProduct,
  deleteProduct,
  listProducts,
  getProduct,
} from "./crudController.js";

const growerId = "507f191e810c19729de860ea";
const productId = "507f1f77bcf86cd799439011";
const growerBody = {
  name: "GreenLeaf",
  slug: "greenleaf",
  shortDescription: "Local",
  description: "Small batches",
  city: "Hyderabad",
  area: "Gachibowli",
  pincode: "500032",
  phone: "9876543210",
  email: "a@example.com",
};
const productBody = {
  growerId,
  name: "Radish",
  slug: "radish",
  shortDescription: "Crisp",
  description: "Fresh",
  price: 99,
  weight: "50g",
  category: "Radish",
  storage: "Keep cold",
  stock: 0,
  images: ["https://example.com/1.webp"],
  isActive: true,
};
const grower = {
  _id: growerId,
  ...growerBody,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};
const product = {
  _id: productId,
  ...productBody,
  pricePaise: 9900,
  createdAt: new Date(),
  updatedAt: new Date(),
};
const response = () => ({
  statusCode: 200,
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(body) {
    this.body = body;
    return this;
  },
});
async function withStubs(stubs, fn) {
  const originals = stubs.map(([obj, key, replacement]) => {
    const old = obj[key];
    obj[key] = replacement;
    return [obj, key, old];
  });
  try {
    await fn();
  } finally {
    for (const [obj, key, old] of originals) obj[key] = old;
  }
}
const chain = (rows) => ({
  sort() {
    return this;
  },
  skip() {
    return this;
  },
  limit() {
    return this;
  },
  lean: async () => rows,
});

test("CRUD creation returns envelopes without grower contact details", async () => {
  await withStubs(
    [
      [Grower, "create", async (v) => ({ ...grower, ...v })],
      [Grower, "exists", async () => true],
      [Product, "create", async (v) => ({ ...product, ...v })],
    ],
    async () => {
      let res = response();
      await createGrower({ body: growerBody }, res);
      assert.equal(res.statusCode, 201);
      assert.equal(res.body.data.phone, undefined);
      assert.equal(res.body.data.email, undefined);
      res = response();
      await createProduct({ body: productBody }, res);
      assert.equal(res.statusCode, 201);
      assert.equal(res.body.data.price, 99);
      assert.equal(res.body.data.thumbnail, productBody.images[0]);
    },
  );
});

test("invalid grower reference and product reassignment are rejected", async () => {
  await withStubs(
    [
      [Grower, "exists", async () => false],
      [Product, "findById", () => ({ lean: async () => product })],
    ],
    async () => {
      let res = response();
      await createProduct({ body: productBody }, res);
      assert.equal(res.statusCode, 400);
      assert.ok(res.body.error.fields.growerId);
      res = response();
      await updateProduct(
        { params: { id: productId }, body: { growerId } },
        res,
      );
      assert.equal(res.statusCode, 400);
    },
  );
});

test("product listing includes sold-out products and pagination", async () => {
  await withStubs(
    [
      [Product, "find", () => chain([product])],
      [Product, "countDocuments", async () => 1],
    ],
    async () => {
      const res = response();
      await listProducts({ query: { growerId, page: "1", limit: "12" } }, res);
      assert.equal(res.body.data[0].stock, 0);
      assert.equal(res.body.pagination.totalPages, 1);
      assert.equal(res.body.data[0].thumbnail, productBody.images[0]);
    },
  );
});

test("product detail by ID and deletion are available for CRUD", async () => {
  await withStubs(
    [
      [Product, "findById", () => ({ lean: async () => product })],
      [
        Product,
        "findByIdAndUpdate",
        async () => ({ ...product, isActive: false }),
      ],
    ],
    async () => {
      let res = response();
      await getProduct({ params: { id: productId } }, res);
      assert.equal(res.body.data.id, productId);
      res = response();
      await deleteProduct({ params: { id: productId } }, res);
      assert.deepEqual(res.body.data, { id: productId, isActive: false });
    },
  );
});

import test from "node:test";
import assert from "node:assert/strict";
import {
  validate,
  pageQuery,
  publicGrower,
  publicProduct,
} from "./catalogue.js";

const grower = {
  name: " GreenLeaf ",
  slug: "GreenLeaf Microgreens",
  shortDescription: "Local",
  description: "Small batches",
  city: "Hyderabad",
  area: "Gachibowli",
  pincode: "500032",
  phone: "9876543210",
  email: "a@example.com",
};
const product = {
  growerId: "507f1f77bcf86cd799439011",
  name: "Radish",
  slug: "Radish Microgreens",
  shortDescription: "Crisp",
  description: "Fresh",
  price: 109.5,
  weight: "50g",
  category: "Radish",
  storage: "Keep cold",
  stock: 0,
  images: ["https://example.com/1.webp", "https://example.com/2.webp"],
  isActive: true,
};

test("normalizes growers and rejects reserved slugs and unknown fields", () => {
  const result = validate("grower", grower);
  assert.deepEqual(result.errors, {});
  assert.equal(result.value.slug, "greenleaf-microgreens");
  assert.equal(result.value.name, "GreenLeaf");
  assert.ok(validate("grower", { ...grower, slug: "admin" }).errors.slug);
  assert.ok(validate("grower", { ...grower, role: "admin" }).errors.role);
});

test("validates price precision, stock, URLs and chronology", () => {
  assert.equal(validate("product", product).value.pricePaise, 10950);
  assert.ok(validate("product", { ...product, price: 1.234 }).errors.price);
  assert.ok(validate("product", { ...product, stock: -1 }).errors.stock);
  assert.ok(
    validate("product", {
      ...product,
      images: ["![image](https://example.com/i)"],
    }).errors.images,
  );
  assert.ok(
    validate("product", { ...product, cultivationDate: "2026-02-30" }).errors
      .cultivationDate,
  );
  assert.ok(
    validate("product", {
      ...product,
      cultivationDate: "2026-09-18",
      harvestDate: "2026-09-17",
    }).errors.harvestDate,
  );
});

test("PATCH preserves omitted fields and validates merged publication", () => {
  const current = {
    ...product,
    pricePaise: 10950,
    images: [],
    isActive: false,
  };
  assert.ok(validate("product", { isActive: true }, current).errors.images);
  assert.deepEqual(validate("product", { stock: 4 }, current).value, {
    stock: 4,
  });
  assert.ok(validate("product", {}, current).errors.body);
  assert.ok(
    validate("product", { growerId: product.growerId }, current).errors
      .growerId,
  );
});

test("pagination and public serializers", () => {
  assert.deepEqual(pageQuery({}), { page: 1, limit: 12, skip: 0 });
  assert.equal(pageQuery({ limit: 101 }), null);
  assert.equal(pageQuery({ page: "0" }), null);
  const serializedGrower = publicGrower({
    _id: "g1",
    ...grower,
    phone: "secret",
    email: "secret",
    isActive: true,
  });
  assert.equal(serializedGrower.phone, undefined);
  assert.equal(serializedGrower.rating, null);
  const serializedProduct = publicProduct({
    _id: "p1",
    ...product,
    pricePaise: 10950,
  });
  assert.equal(serializedProduct.thumbnail, product.images[0]);
  assert.equal(serializedProduct.price, 109.5);
  assert.equal(serializedProduct.stock, 0);
});

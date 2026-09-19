const apiBaseUrl = (
  process.env.API_BASE_URL || "http://localhost:5100/api/v1"
).replace(/\/$/, "");
const cdn = "https://res.cloudinary.com/mwxiqdif/image/upload";
const image = {
  amaranth: `${cdn}/v1789809494/amaranth.jpg`,
  basil: `${cdn}/v1789810093/basil.jpg`,
  beet: `${cdn}/v1789810113/beet.jpg`,
  broccoli: `${cdn}/v1789810113/broccoli.jpg`,
  fenugreek: `${cdn}/v1789810114/fenugreek.jpg`,
  mustard: `${cdn}/v1789810114/mustard.jpg`,
  radish: `${cdn}/v1789810114/radish.jpg`,
  sunflower: `${cdn}/v1789810114/sunflower.jpg`,
  peaShoots: `${cdn}/v1789810114/pea-shoots.jpg`,
  hero: `${cdn}/v1789810114/hero.jpg`,
};

const growerRows = [
  [
    "greenleaf-microgreens",
    "GreenLeaf Microgreens",
    "Gachibowli",
    "hero",
    "Fresh pesticide-free microgreens, lovingly grown and harvested in small batches.",
  ],
  [
    "urban-harvest",
    "Urban Harvest",
    "Kondapur",
    "sunflower",
    "A little urban farm with a big love for clean, sustainable growing.",
  ],
  [
    "fresh-roots-farm",
    "Fresh Roots Farm",
    "Tellapur",
    "peaShoots",
    "Family-grown greens. Honest practices. Freshness you can taste.",
  ],
  [
    "sprout-valley",
    "Sprout Valley",
    "Manikonda",
    "broccoli",
    "Thoughtfully grown little greens for your everyday feel-good meals.",
  ],
];
const growers = growerRows.map(
  ([slug, name, area, imageKey, shortDescription], index) => ({
    name,
    slug,
    logo: null,
    coverImage: image[imageKey],
    shortDescription,
    description: `${shortDescription} We grow close to home, using careful cultivation and small-batch harvesting. Meet your new neighbourhood grower.`,
    city: "Hyderabad",
    area,
    pincode: "500032",
    phone: `987654321${index}`,
    email: `${slug}@example.com`,
    deliveryText: "Delivery in 24–48 hours",
    deliveryFee: 20,
    deliveryPincodes: ["500032"],
    pickupDetails: `Pickup from ${area}, Hyderabad, between 9 AM and 5 PM`,
    isActive: true,
  }),
);

const selections = [
  [
    [
      "Radish Microgreens",
      "radish",
      99,
      "Radish",
      "Peppery, vibrant and full of character.",
    ],
    [
      "Sunflower Microgreens",
      "sunflower",
      119,
      "Sunflower",
      "A nutty crunch for your everyday bowl.",
    ],
    [
      "Mustard Microgreens",
      "mustard",
      99,
      "Mustard",
      "A little green with a delicious kick.",
    ],
    [
      "Pea Shoots",
      "peaShoots",
      119,
      "Pea Shoots",
      "Sweet, tender and freshly picked.",
    ],
    [
      "Broccoli Microgreens",
      "broccoli",
      129,
      "Broccoli",
      "Mild, delicate greens for everyday goodness.",
    ],
  ],
  [
    [
      "Red Radish",
      "radish",
      109,
      "Radish",
      "Bright stems with a peppery finish.",
    ],
    [
      "Fenugreek Microgreens",
      "fenugreek",
      89,
      "Fenugreek",
      "Familiar methi flavour, tender little leaves.",
    ],
    [
      "Amaranth Microgreens",
      "amaranth",
      119,
      "Amaranth",
      "Beautiful crimson leaves, earthy flavour.",
    ],
    [
      "Mixed Greens Box",
      "hero",
      249,
      "Mixed Greens",
      "A colourful selection of our daily harvest.",
    ],
  ],
  [
    [
      "Sunflower Shoots",
      "sunflower",
      119,
      "Sunflower",
      "Fresh, nutty and satisfyingly crunchy.",
    ],
    [
      "Pea Shoots",
      "peaShoots",
      119,
      "Pea Shoots",
      "Naturally sweet, tender shoots.",
    ],
    [
      "Mustard Greens",
      "mustard",
      99,
      "Mustard",
      "Bring a little heat to your next meal.",
    ],
    [
      "Wellness Mix",
      "broccoli",
      229,
      "Mixed Greens",
      "A fresh mix for a brighter daily bowl.",
    ],
  ],
  [
    [
      "Basil Microgreens",
      "basil",
      149,
      "Basil",
      "Tiny leaves with a beautifully bold aroma.",
    ],
    [
      "Beetroot Microgreens",
      "beet",
      139,
      "Beetroot",
      "Earthy sweetness and pretty pink stems.",
    ],
    [
      "Pea Shoots",
      "peaShoots",
      119,
      "Pea Shoots",
      "Sweet, tender and full of freshness.",
    ],
  ],
];

async function request(path, options = {}) {
  let response;
  try {
    response = await fetch(`${apiBaseUrl}${path}`, {
      ...options,
      headers: { "content-type": "application/json", ...options.headers },
    });
  } catch (error) {
    throw new Error(`Cannot connect to ${apiBaseUrl}: ${error.message}`);
  }
  const text = await response.text();
  let body;
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    body = { rawResponse: text };
  }
  if (!response.ok)
    throw new Error(
      `${options.method || "GET"} ${path} returned ${response.status}: ${JSON.stringify(body)}`,
    );
  return body;
}

async function findBySlug(resource, slug) {
  const result = await request(
    `/${resource}?search=${encodeURIComponent(slug)}&limit=100`,
  );
  return result.data?.find((record) => record.slug === slug) || null;
}

async function upsert(resource, payload) {
  const existing = await findBySlug(resource, payload.slug);
  const body = { ...payload };
  if (existing && resource === "products") delete body.growerId;
  const method = existing ? "PATCH" : "POST";
  const path = existing ? `/${resource}/${existing.id}` : `/${resource}`;
  const result = await request(path, { method, body: JSON.stringify(body) });
  console.log(
    `${existing ? "Updated" : "Created"} ${resource.slice(0, -1)}: ${payload.name} (${result.data.id})`,
  );
  return result.data;
}

async function main() {
  console.log(`Seeding growers at ${apiBaseUrl}...`);
  const savedGrowers = [];
  for (const grower of growers)
    savedGrowers.push(await upsert("growers", grower));
  console.log("Seeding products...");
  let productCount = 0;
  for (const [growerIndex, rows] of selections.entries()) {
    for (const [name, imageKey, price, category, shortDescription] of rows) {
      const slug = `${name.toLowerCase().replaceAll(" ", "-")}-${growerIndex + 1}`;
      await upsert("products", {
        growerId: savedGrowers[growerIndex].id,
        name,
        slug,
        shortDescription,
        description: `${shortDescription} Grown locally in small batches and carefully packed to keep every leaf fresh. Perfect for salads, sandwiches, wraps and finishing your favourite dishes.`,
        price,
        category,
        weight: category === "Mixed Greens" ? "150g" : "50g",
        images: [image[imageKey], image[imageKey], image.hero],
        cultivationDate: "2026-09-05",
        harvestDate: "2026-09-12",
        bestBefore: "2026-09-15",
        storage: "Keep refrigerated at 2–5°C. Rinse before use.",
        stock: growerIndex === 3 && name === "Beetroot Microgreens" ? 0 : 20,
        isActive: true,
      });
      productCount += 1;
    }
  }
  console.log(
    `Seed complete: ${savedGrowers.length} growers and ${productCount} products created or updated.`,
  );
  console.log(`Test growers: ${apiBaseUrl}/growers`);
  console.log(
    `Test first grower products: ${apiBaseUrl}/products?growerId=${savedGrowers[0].id}`,
  );
}

main().catch((error) => {
  console.error(`Seed failed: ${error.message}`);
  process.exitCode = 1;
});

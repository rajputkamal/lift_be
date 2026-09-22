# Welcome to the Lift BE

## Table of Content

- [About the Repo](#lift)
- [Installation and Tech-stack](#installation)

# Lift - Ride Sharing App

Lift is a simple and efficient ride-sharing application that allows users to offer rides and discover available rides based on their travel needs.

The goal of Lift is to reduce travel costs, traffic congestion, and make commuting more convenient by connecting people traveling along similar routes.

# Installation

This back-end app is developed using [Nodejs](https://nodejs.org/en) and [Express](https://expressjs.com/).

The entire code-base is available on [GitHub](https://github.com/rajputkamal/lift_be).

```bash
git clone https://github.com/rajputkamal/lift_be
```

Use the node package manager [NPM](https://www.npmjs.com/) to install all dependencies.

```bash
npm install
```

To get the `.env` file contact the developer.

To run the app in development mode.

```bash
npm run dev
```

## App is deployed on Google cloud provider

- To understand the entire process connect with dev.

- Query to see logs on GCP

  `resource.type="cloud_run_revision"
resource.labels.service_name="lift-be"
`

- URL: https://console.cloud.google.com/logs/query;query=%0A;cursorTimestamp=2026-01-31T10:29:41.867668Z;duration=PT5M?project=lift-475112

## Command to get the LAN IP–based localhost URL

`ipconfig getifaddr en0`

## Made with ❤️ to simplify everyday travel.

## Grower catalogue (phase one)

The grower catalogue uses the existing Express and MongoDB service. See [OpenAPI](docs/grower-openapi.yaml), [Postman collection](docs/grower-postman.json), and [frontend integration notes](docs/grower-frontend.md).

1. Set `MONGO_URI` in `.env` as for the rest of this project. The MVP CORS allowlist includes `http://localhost:3000`, `https://green-sprout-store.vercel.app`, and `https://micro-greens.foodieai.in`. `ALLOWED_FRONTEND_ORIGINS` may add more exact comma-separated browser origins later. CORS reflects an allowed origin and returns `Access-Control-Allow-Credentials: true`; it never combines credentialed requests with a wildcard origin.
2. Run `npm install`, then `npm run migrate:grower` to create catalogue indexes. Mongoose also builds indexes on startup, but the migration makes deployment explicit. No existing collection data is rewritten.
3. Run `npm run dev` (or `npm start`). The catalogue is under `/api/grower/v1`; guest checkout and payment routes are under `/api/grower-checkout/v1`.
4. Run `npm run test:grower` for validation and checkout checks. No development seed data is required; use the [Postman demo guide](docs/grower-postman-guide.md) to create a grower and product.

Catalogue routes: `POST/GET /api/grower/v1/growers`, `GET/PATCH/DELETE /api/grower/v1/growers/:id`, and the same set under `/products`. `PATCH` preserves omitted fields; `PUT` is not supported. `DELETE` marks a record inactive and can be repeated. These direct CRUD routes have no authentication in this simplified MVP, so use them only in a controlled environment. Checkout still requires active growers and products.

MongoDB ObjectIds are returned as stable string `id` values. Slugs are normalized and unique within each collection. All API money is INR with at most two decimal places; MongoDB stores integer `pricePaise`. Grower responses omit pincode, phone and email. Timestamps are UTC ISO 8601. All dates use `YYYY-MM-DD`. Text limits and required fields are specified in the OpenAPI file.

## Guest checkout and Razorpay Test Mode

See [checkout setup and frontend flow](docs/grower-checkout.md) and the [environment example](docs/grower-checkout.env.example). The [Postman collection](docs/grower-postman.json) and [demo guide](docs/grower-postman-guide.md) cover each route. `npm run migrate:grower` creates order and reservation indexes as well. Run `npm run cleanup:grower-orders` on a schedule to expire unpaid reservations. Checkout transactions require MongoDB Atlas or another replica set. Run `npm run test:grower` for catalogue and checkout tests.

To populate or update the frontend demo catalogue through the actual HTTP APIs, start the backend and run `npm run seed:grower-demo`. The seed script finds records by slug, updates existing records, and creates missing records. All demo image fields use Cloudinary URLs. Override the API address with `API_BASE_URL=https://your-api/api/grower/v1 npm run seed:grower-demo`.

Set `CLOUDINARY_URL=cloudinary://API_KEY:API_SECRET@CLOUD_NAME` to enable optional server-side uploads. `POST /api/grower/v1/growers` continues to accept JSON image URLs, and also accepts `multipart/form-data` files in `logo` and `coverImage`. `POST /api/grower/v1/products` accepts either JSON image URLs or up to eight multipart files named `images`. Uploaded files must be JPEG, PNG, WebP, or AVIF and no larger than 5 MB each. Cloudinary credentials remain server-side.

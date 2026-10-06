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

## Micro Greens Kart

Micro Greens Kart uses this repository's isolated `SERVICE_MODE=microgreens`
application. Lift and Foodie continue to use the existing default mode. MongoDB
selection is fixed by deployment, never by an incoming browser hostname.

### Local setup

Use the repository's Node 18 runtime (matching the existing image); a supported
runtime upgrade should be tested separately. Install dependencies with `npm ci`.
Copy [.env.example](.env.example) to an untracked `.env` only when creating a new local
configuration. Preserve an existing `.env` and add the relevant variables instead.
Provide MongoDB Atlas/replica-set credentials and Razorpay TEST credentials privately.
No secrets belong in Git, Postman, browser settings or logs.

```sh
npm ci
npm run start:microgreens
npm run check:grower
```

Email sending and catalogue writes default to disabled. Local HTTP uses
`GUEST_COOKIE_CROSS_SITE=false`; localhost calling the HTTPS test backend needs
`true` and `credentials: "include"`. Browser third-party-cookie policies still apply.
Production rejects localhost origins. Add only exact trusted origins to the test
allowlist. `MICROGREENS_ENVIRONMENT=test` requires Mongo database `rides`;
production requires `microgreenskart`. Wrong database configuration fails startup.

### Structure and development commands

| Location                                                    | Purpose                                                            |
| ----------------------------------------------------------- | ------------------------------------------------------------------ |
| `src/grower/catalogue.js`, `crudController.js`, `routes.js` | Catalogue contracts and controllers                                |
| `src/grower/checkout/`                                      | Order pricing, guest sessions, reservations, Razorpay and webhooks |
| `src/grower/models/`                                        | Grower, product, order, reservation and webhook persistence        |
| `src/grower/email/config.js`, `schema.js`                   | Backend gates and embedded durable notification schema             |
| `src/grower/email/resend.js`                                | Resend HTTP client and sanitized provider errors                   |
| `src/grower/email/service.js`, `routes.js`                  | Atomic claims, retry handling and authenticated worker             |
| `src/grower/email/templates.js`, `layout.js`                | Order wording, HTML escaping and padded email layout               |
| `docs/`                                                     | Machine-readable OpenAPI and Postman contracts                     |
| `deploy/`                                                   | Manual isolated builds, Cloud Run and Firebase deployment helpers  |

- `npm run lint`: ESLint for Micro Greens modules and maintenance scripts only.
- `npm run format:grower`: format Micro Greens modules, scripts, deployment files and docs.
- `npm run format:grower:check`: verify formatting without writing files.
- `npm run test:grower`: mocked catalogue, checkout, isolation and email tests.
- `npm run check:grower`: lint, formatting verification and tests together.
- `npm run migrate:grower`: explicitly create catalogue, order/outbox and reservation indexes.
- `npm run cleanup:grower-orders`: expire unpaid reservations; configure one scheduling owner.
- `npm run seed:grower-demo`: HTTP demo seed for an explicitly selected controlled API.

The existing repository-wide `format` commands remain available; use the scoped
commands above for work that must leave Lift and Foodie files untouched.
Do not seed, backfill, migrate or clean up a live database without reviewing the
selected URI/environment. Tests use mocks; real Mongo concurrent transactions,
unique indexes and external provider delivery require integration validation.

### API and frontend integration

Test API: `https://test-api.microgreenskart.in/v1`.
Production API: `https://api.microgreenskart.in/v1`.
Legacy catalogue `/api/grower/v1` and checkout `/api/grower-checkout/v1` remain available.
See [OpenAPI](docs/grower-openapi.yaml), [Postman collection](docs/grower-postman.json)
and [demo collection](docs/grower-demo-seed-postman.json) for detailed bodies.
In Postman set both base variables to `/v1` for the isolated service and retain the cookie jar.

| Method                | Path relative to `/v1`                  | Contract                                                           |
| --------------------- | --------------------------------------- | ------------------------------------------------------------------ |
| GET                   | `/growers`, `/products`                 | Paginated lists: `{success,data,pagination}`                       |
| GET                   | `/growers/:id`, `/products/:id`         | Single record: `{success,data}`                                    |
| POST / PATCH / DELETE | Catalogue routes                        | Disabled in isolated deployments; controlled CRUD only             |
| POST                  | `/orders`                               | Validated order body and `Idempotency-Key`; creates guest cookie   |
| GET                   | `/orders`, `/orders/:id`                | Guest cookie and ownership required                                |
| POST                  | `/orders/:id/payment/verify`            | Razorpay callback IDs/signature; backend verifies captured payment |
| POST                  | `/orders/:id/payment/reconcile`         | Fetches payment state without collecting again                     |
| POST                  | `/webhooks/razorpay`                    | Signed raw JSON, event-ID deduplication                            |
| POST                  | `/internal/email-notifications/process` | Private worker token; never called by frontend                     |

The frontend must unwrap `data`, iterate list pages, display sold-out products and
handle null images/ratings/dates without inventing values. ObjectIds serialize as
strings. API amounts are INR; persisted prices/gateway amounts are integer paise.
Dates are `YYYY-MM-DD`; timestamps are UTC ISO strings.

For order creation supply growerId, distinct items `{productId,quantity}`,
purchaseType (`one-time` or `subscription`), fulfilment (`pickup` or `delivery`),
firstDate and shipping. Pickup needs name and Indian mobile phone. Delivery also
needs house, building, street, city, state and six-digit pincode. Email and landmark
are optional in the API; collect `shipping.email` if email confirmation is wanted.
Never submit client totals/payment status. Use `credentials: "include"` for all
checkout calls. Reuse the same Idempotency-Key for retries of the same request.
A 202 response with payment null requires operator review; do not automatically
create another payment with a new key.

Pass the API's payment fields to Razorpay Checkout. Send the callback's
razorpay_payment_id, razorpay_order_id and razorpay_signature to verification.
Reconcile when the callback is lost. Confirm only when the backend returns paid.
The server requires the matching captured INR amount; pending/failed payments do
not send confirmations. Full refunds are terminal; partial refunds or expired
capacity conflicts become resolution_required. Configure one Razorpay TEST webhook
for payment.captured and refund.processed, retaining its private webhook secret.

Subscriptions schedule four weekly fulfilments and charge the whole amount upfront;
there is no renewal engine. Product stock is capacity per date. Reservations expire
after 15 minutes, and atomic transactions reserve all scheduled dates.
Delivery dates must match the grower's deliveryDays. isCitywideDelivery requires a
matching shipping city; otherwise serviceablePincodes defines coverage.
deliveryPincodes is the separate free-delivery list, not the coverage list.
Subscriptions multiply basket and applicable fees by four. Pickup uses saved
pickupDetails. Review demo grower delivery configuration before real launch.

### Catalogue uploads

Controlled catalogue CRUD accepts JSON image URLs or multipart uploads when
CLOUDINARY_URL is configured. Grower file fields: logo and coverImage. Product
files: up to eight repeated images fields. Supported JPEG/PNG/WebP/AVIF files have
a 5 MB limit each. Send array properties as JSON strings in multipart forms;
do not mix URL and upload inputs for the same field. The API stores Cloudinary
HTTPS URLs and attempts cleanup if persistence fails. Catalogue deletion is a
soft delete and does not delete Cloudinary assets. Public isolated deployments
keep writes disabled until administrator authentication is implemented.

### Order emails and Resend

Resend handles paid-order confirmations; Zoho receives replies at
orders@microgreenskart.in. HubSpot retains CRM capture and all enquiries.
There is no backend Resend enquiry endpoint or automated WhatsApp integration.
The frontend must disable HubSpot's order-confirmation email action at cutover,
while preserving CRM capture. Remove obsolete confirmation-page email triggers;
backend emails do not depend on the customer opening that page.
NEXT_PUBLIC_ENABLE_TEST_NOTIFICATIONS does not gate backend sending.

Configuration lives in [.env.example](.env.example). Set
EMAIL_NOTIFICATIONS_ENABLED=true only for an approved environment.
Test requires an explicit EMAIL_TEST_RECIPIENT_ALLOWLIST; production uses the saved
customer address. A test address is never substituted for a real recipient.
Disabled/missing-email/restricted-recipient events are permanently suppressed;
enabling later does not replay historical paid orders or suppressed records.

Payment verification, reconciliation and Razorpay webhooks share one transaction
that persists paid status and one embedded emailNotification. No provider request
occurs in payment handling. Worker claims use atomic leases and ownership tokens;
stable keys and frozen request payloads protect against concurrent/repeated sends.
Email failures never change payment state. Retry uses exponential backoff up to
one hour. After 23 hours from the first attempt, unfinished sends enter review
because Resend retains idempotency keys for 24 hours. Inspect provider logs before
any manual resend. Never blindly reset firstAttemptAt or accepted records.
accepted means Resend returned a provider ID, not confirmed inbox delivery;
check delivery/bounces in Resend. Monitor pending/retry, failed and review states.

The template includes HTML and plain text, saved item/price/fulfilment snapshots,
Asia/Kolkata order dates, subscription totals and grower-specific delivery days.
Layout uses email presentation tables with 24px desktop and 16px mobile padding.
Editing the template requires rebuilding/deploying the test backend and sending a
new test order. Delivered emails do not change or resend automatically.

### Private secrets and retry schedule

Create a Resend Sending access key restricted to the verified microgreenskart.in
domain. Copy its value at creation; existing masked keys cannot be recovered.
Use only Resend-generated sending DNS records; preserve Zoho inbox MX/SPF/DKIM
and existing Firebase/Vercel records. Do not enable Resend receiving.

| Environment | API key secret                  | Worker token secret                 | Runtime service account                                  |
| ----------- | ------------------------------- | ----------------------------------- | -------------------------------------------------------- |
| Test        | microgreens-test-resend-api-key | microgreens-test-email-worker-token | microgreens-api-test@lift-475112.iam.gserviceaccount.com |
| Production  | microgreens-resend-api-key      | microgreens-email-worker-token      | microgreens-api@lift-475112.iam.gserviceaccount.com      |

Generate a separate token per environment with `openssl rand -hex 32`.
Store private values in Secret Manager and grant secretAccessor only to the matching
runtime on those secrets. Bind pinned versions as RESEND_API_KEY and EMAIL_WORKER_TOKEN.
Rotate by adding versions, not by deleting/recreating secrets.

The worker requires an authenticated POST to `/v1/internal/email-notifications/process`,
header `Authorization: Bearer <EMAIL_WORKER_TOKEN>`, empty body. Responses include
enabled and processed counts. Wrong/missing tokens return 403; persistence errors
return 503. There is no in-process timer or unawaited work after responses.

Configure one trusted Cloud Scheduler job per environment: every minute
(`* * * * *`), Asia/Kolkata, HTTP POST, private Authorization header, 60s attempt
deadline, 60–300s retry backoff. Do not configure Scheduler OIDC over the same
Authorization header: this endpoint currently checks the private token.
Restrict job configuration access; the header contains a credential. The scheduler
uses the token value, not a Secret Manager reference. Keep reservation expiry separate.

Test job `microgreens-test-order-emails` in asia-south1 targets the direct test URL:
`https://microgreens-api-test-890845531583.asia-south1.run.app/v1/internal/email-notifications/process`.
It runs every minute and test sending was enabled for rajput.kamal40@gmail.com.
The padded template and subsequent local cleanup still require a new deployment.
Resend was confirmed on its Free plan during setup; review account limits before launch.

### Deployment, validation and rollback

Project `lift-475112`; region asia-south1; repository `microgreens`.
Test service microgreens-api-test uses rides via microgreens-test-mongo-uri;
production microgreens-api uses microgreenskart via microgreens-mongo-uri.
Both keep Razorpay TEST mode. Test max instances 1; production 3; min instances 0.
Firebase API sites and frontend origins are separate. Never deploy to lift-be or
replace the frontend Hosting site. Keep `__session` for Firebase cookie forwarding,
credentialed CORS and private/no-store responses. No guest-cookie migration across hosts.

Build the isolated image with tests (does not deploy):

```sh
gcloud builds submit --project=lift-475112 --region=asia-south1 \
  --config=deploy/cloudbuild.microgreens-image.yaml .
```

Deploy a reviewed immutable digest to the selected microgreens service. The deployment
helpers use --update-env-vars/--update-secrets to preserve existing email settings
and secret bindings. Include those bindings explicitly when creating a new service;
updating an existing service does not automatically enable production sending.
Do not commit/push/deploy or alter DNS as an incidental part of cleanup.
Secret Manager, Cloud Scheduler, builds and hosting can incur charges independently
of Resend's Free plan. Budget alerts do not enforce a spending cap.

Before launch, validate indexes and real transaction concurrency on a test replica set.
Complete a new Razorpay TEST payment with the allowed email, verify delivery and
repeat verify/webhook/reconcile to check that one order produces one email and the
expected CRM record. Frontend HubSpot order-email cutover must happen before enabling
production Resend; preserve enquiry workflows. Confirm Zoho replies.

Rollback: disable backend sending and pause its scheduler first. Review in-flight,
accepted and uncertain events before re-enabling HubSpot emails for new events only.
Do not bulk replay historical workflows or reset outboxes. Cloud Run revision rollback
and Firebase Hosting release rollback are independent; retain the previous revision
and pinned secret versions. Database records must not be deleted or reseeded.

Official references: [Resend API](https://resend.com/docs/api-reference/emails/send-email),
[idempotency](https://resend.com/docs/dashboard/emails/idempotency-keys),
[Cloud Run secrets](https://docs.cloud.google.com/run/docs/configuring/services/secrets),
[Cloud Scheduler](https://docs.cloud.google.com/scheduler/docs/creating).

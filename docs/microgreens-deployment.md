# Micro Greens Kart backend separation

## Decision and inventory

One codebase, image and database; `SERVICE_MODE=microgreens` dynamically imports
only grower catalogue and checkout routers. Unset mode retains all original
Lift/Foodie/legacy grower routes. No duplicate application or workspace conversion.
`app.js` now constructs the app without opening a database connection; the existing
`npm start` entry point connects before listening. Import-only consumers must connect
explicitly. The server handles SIGTERM/SIGINT and drains HTTP before disconnecting.

Microgreens dependencies: Grower/Product, GuestOrder, GrowerDayReservation,
GrowerWebhookEvent models, catalogue validation/serialization, Cloudinary multipart
uploads, crypto guest sessions, Razorpay test REST API and MongoDB transactions.
No Lift JWT/OTP/user API, Foodie uploads, restaurant/menu/order APIs or ride cron is
needed. Images are Cloudinary URLs, not `/uploads`. No separate customer/login API
exists: checkout grants a host-only HttpOnly guest cookie. No background timers or
workers run in microgreens mode. `scripts/expireGrowerOrders.js` is an external job;
retain one existing scheduling owner, do not create a second schedule. Ride completion
is an HTTP endpoint in the default service only. No database migration/reseed required.

Existing payment safeguards are reused: test-key enforcement, server-calculated
prices, gateway fetch and signature validation, guest ownership filters, order
idempotency keys and transactional payment/refund state transitions. Webhook event
IDs have a unique index; retries acknowledge recorded events. Concurrent deliveries
can enter the handler before the event record is written; transactional order state
makes captured payments/full refunds idempotent. Real concurrent transaction behavior
and unique indexes must be confirmed against a non-production Mongo replica set
before cutover; local tests use model stubs. Configure ONE Razorpay webhook destination
for the new service after validation; do not intentionally fan out to both services.

**Approved production security change:** the existing catalogue POST/PATCH/DELETE
(including uploads) are unauthenticated. The user selected disabling those operations
on the microgreens service. `MICROGREENS_CATALOGUE_WRITES=disabled` returns 403 with
`CATALOGUE_WRITES_DISABLED` before controller/upload execution on both new and legacy
prefixes. Reads and guest checkout remain available. Default Lift service behavior is
unchanged. Microgreens mode defaults to disabled; `enabled` is a future opt-in and
must not be used publicly until administrator authentication is implemented.
Guest orders and payment operations
retain their existing cookie/origin checks. New host means a new guest session: cookies
and previous guest order access do not migrate across hosts.

## Complete endpoint mapping

All bodies, queries, response envelopes and validation remain unchanged. Catalogue
write methods are intentionally denied on the new service as approved above.
Both legacy prefixes remain mounted, including on the microgreens service; no redirects.

| Methods            | Existing path                                        | New path                         |
| ------------------ | ---------------------------------------------------- | -------------------------------- |
| GET, POST          | /api/grower/v1/growers                               | /v1/growers                      |
| GET, PATCH, DELETE | /api/grower/v1/growers/:id                           | /v1/growers/:id                  |
| GET, POST          | /api/grower/v1/products                              | /v1/products                     |
| GET, PATCH, DELETE | /api/grower/v1/products/:id                          | /v1/products/:id                 |
| GET, POST          | /api/grower-checkout/v1/orders                       | /v1/orders                       |
| GET                | /api/grower-checkout/v1/orders/:id                   | /v1/orders/:id                   |
| POST               | /api/grower-checkout/v1/orders/:id/payment/verify    | /v1/orders/:id/payment/verify    |
| POST               | /api/grower-checkout/v1/orders/:id/payment/reconcile | /v1/orders/:id/payment/reconcile |
| POST               | /api/grower-checkout/v1/webhooks/razorpay            | /v1/webhooks/razorpay            |

Additional operational endpoints: GET `/health` (liveness), GET `/ready` (readiness).
Example: `/api/grower/v1/growers?isActive=true&page=1&limit=100` becomes
`https://api.microgreenskart.in/v1/growers?isActive=true&page=1&limit=100`.

## Configuration (names only for secrets)

- `SERVICE_MODE`: `default` (implicit) or `microgreens`; invalid values fail startup.
- `MICROGREENS_API_PREFIX`: `/v1`, validated path; changes new mounts and cookie path.
- `PORT`: Cloud Run supplied; default 8080.
- `NODE_ENV`: production on Cloud Run.
- `ALLOWED_FRONTEND_ORIGINS`: comma-separated exact origins. Microgreens defaults include
  `https://microgreenskart.in`, `https://www.microgreenskart.in`,
  `https://green-sprout-store.vercel.app`, `https://micro-greens.foodieai.in`.
  Development includes `http://localhost:3000`; explicitly add other approved local origins.
  Microgreens production rejects localhost and non-HTTPS origins, even when configured.
  No wildcard credentialed CORS. Default service keeps its original origin defaults.
- `GUEST_COOKIE_NAME`: default `grower_guest`; new Firebase deployment uses `__session`.
- `GUEST_COOKIE_CROSS_SITE`: optional `true`, existing behavior retained. HTTPS frontend
  sessions already set `SameSite=None; Secure`, plus HttpOnly, no Domain attribute and
  a cookie Path matching the checkout router used (`/v1` or legacy prefix).
- `MONGO_URI`, `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`,
  `CLOUDINARY_URL`: Secret Manager bindings, never put values in build substitutions.
  Use a Mongo user restricted to the microgreens collections where feasible; the same
  database and collection names must remain. Transactions require a replica set.
- `PUBLIC_API_URL`, `FRONTEND_URL`: deployment metadata for future consumers; current
  handlers emit no absolute API/frontend links and do not use these values.

No `JWT_SECRET`, Message Central credentials or `CRON_KEY` needed by this service.
The runtime service account needs Secret Manager secretAccessor only on these five
specific secrets; it does not need Editor, Cloud Run Admin or database cloud roles.
Confirm any existing private networking/egress requirements before copying this plan.

## Selected deployment: Firebase Hosting + Cloud Run

The user selected Firebase Hosting for HTTPS/custom-domain forwarding to a separate
`microgreens-api` Cloud Run service in `asia-south1`. No customer-managed load balancer,
static IP, Cloud Run domain mapping or new repository is needed. Firebase Hosting
supports Cloud Run rewrites in this region. It forwards the original URL unchanged.
Source: https://firebase.google.com/docs/hosting/cloud-run

Local cloud CLIs are unavailable. Google Cloud project `lift-475112` and active billing are confirmed.
Atlas database `microgreenskart` was created on existing `Cluster0`, with an empty
`growers` collection. The existing `rides` database was not modified.
All five Secret Manager bindings are configured; the new Mongo connection was
validated against `microgreenskart`. A dedicated Firebase API Hosting site is deployed. Cloud Run `microgreens-api` and its Firebase API Hosting site are deployed. DNS,
frontend routing, webhook and scheduler configuration have not been changed. Project number
890845531583 from the supplied URL is not a verified project ID.

Before provisioning, inventory existing lift-be secret names, runtime account, network/
database access, Artifact Registry repositories, Firebase sites, billing and schedulers.
Do not display secret payloads. Preserve the existing scheduler/webhook owner and all
production data. Select a separate Hosting site so deployment cannot overwrite a frontend.

Resources: microgreens-api (1 CPU, 512MiB, min 0/max 3 instances, request-based billing),
scoped runtime account, five secrets/bindings, Artifact Registry repository if needed,
Cloud Build deployment target and a dedicated Firebase Hosting site. No Firestore,
Firebase Auth, App Hosting or Firebase database is required. Existing MongoDB stays in use
unless the user selects a separate database; no migration is automatic.

Cost: Blaze pay-as-you-go billing is required. Hosting includes 360MB/day transfer and
10GB storage free, then published usage rates; HTTPS/custom-domain support is included.
Cloud Run has monthly free allowances shared by the billing account, with excess CPU,
memory/requests billed. Builds, image storage, secrets, logging and network transfer
can incur additional charges. A small launch may fit into allowances; the earlier
Rs 0–500/month planning range is not a guaranteed quote or cap. Database, Cloudinary,
domain/email and payment fees are separate. Set budget alerts, min instances 0, limit
instance count and review the actual billing after launch. Alerts do not stop charges.
Sources: https://firebase.google.com/pricing and https://cloud.google.com/run/pricing

Cloud Run uses public invocation and ingress `all` for Firebase forwarding; its run.app
URL also remains reachable. Do not disable that URL, which Firebase Hosting needs.
No security-sensitive public-access change is applied before reviewing the concrete
service/IAM plan. Catalogue writes are disabled on this service, as approved by the user. Firebase is not an authorization layer.

## Firebase session and cache behavior

Firebase forwards only `__session` cookies to Cloud Run. `GUEST_COOKIE_NAME=__session`
is set only for the new deployment; the default remains `grower_guest`. Secure,
HttpOnly, SameSite and router-scoped Path behavior is preserved. Only these two names
are accepted; invalid configuration fails startup. New host means a new guest session.
All microgreens responses set `Cache-Control: private, no-store`, and Hosting headers
also specify no-store, so guest order data is not cached. Public catalogue caching
can be considered later after explicit validation.
Source: https://firebase.google.com/docs/hosting/manage-cache#using_cookies

## Deployment commands (execute after project/resource review)

First create or select the approved Firebase project/site, Artifact Registry repository,
runtime account and secrets. Prefer existing secret names with reviewed pinned versions.
The runtime needs secretAccessor only on its five secrets. The build account needs
repository write, microgreens-only deployment rights and runtime serviceAccountUser;
public invocation IAM must be set by an authorized provisioner. Do not share a service
account JSON key in chat. Use local interactive sign-in or authenticated Cloud Shell.

```sh
gcloud builds submit --project=PROJECT_ID --region=asia-south1 --config=deploy/cloudbuild.microgreens.yaml .
```

The checked-in build config hardcodes `microgreens-api` and never deploys lift-be.
Its secret/repository/account substitutions must match the inventoried resources.
The YAML deploys the backend only; separately bind and deploy the isolated Hosting target:

```sh
firebase login
firebase hosting:sites:list --project PROJECT_ID
firebase target:apply hosting microgreens-api SELECTED_API_SITE_ID --project PROJECT_ID --config deploy/firebase.microgreens.json
firebase deploy --project PROJECT_ID --config deploy/firebase.microgreens.json --only hosting:microgreens-api
```

Use an available unique site ID for a new site; do not guess a global site name or
reuse the existing frontend target. Target binding writes local `.firebaserc` configuration;
retain it beside the deployment config for this project. Hosting has a 60-second timeout.
Do not use `firebase init` to overwrite the isolated config. Smoke-test the generated
site.web.app URL before assigning the domain. Keep Razorpay test mode throughout.

## Exact DNS instructions (pending Firebase domain wizard)

In the selected API Hosting site, add **api.microgreenskart.in** as a custom domain,
without redirecting it to another domain. Capture the exact ownership TXT and serving
A/CNAME records shown by Firebase; put only those generated values in GoDaddy.
No IP or record value has been generated yet, so no DNS values can be supplied now.

Export the DNS zone first. Add ownership TXT as a separate record, never overwrite
Zoho/SPF verification TXT. Modify only conflicting api A/AAAA/CNAME records after
review; do not edit apex/www, MX, SPF, DKIM, DMARC, nameservers or frontend routing.
Check CAA if certificate issuance is blocked. Verify Firebase domain Connected status,
HTTPS certificate and API GET/OPTIONS before production frontend cutover.
Source: https://firebase.google.com/docs/hosting/custom-domain

## Verification and limits

`npm run test:grower` includes controller/validation/payment tests and HTTP separation
checks with stubbed database reads. Verify service-mode production CORS with localhost
denied, new domains allowed, health/readiness, guest 401/ownership, legacy routes,
server-side pricing/signatures, invalid webhook signatures and recorded duplicate events.
**Local result: 34 tests pass** (`npm run test:grower`), including fresh-process model isolation and signed webhook raw parsing/retry deduplication. `git diff --check` and formatting checks for changed files pass. These are local tests; no real Mongo transactions, Cloudinary upload, Razorpay calls,
Cloud Run SIGTERM or deployment smoke tests have run. Node 18 is the existing Docker/
package target and is EOL; plan a separately validated runtime upgrade before production.

Before routing changes, stage on approved infrastructure, verify Mongo unique indexes
and concurrent captured/refund retries (including crash before event recording), test
order -> Razorpay test payment -> verification -> webhook retry -> reconcile, actual
multipart uploads, guest cookies with `credentials: include`, SIGTERM draining, logs,
readiness and exclusion of Foodie/Lift. Keep expiration scheduled exactly once. Don't
run migration/demo seed/cleanup against production during validation.

## Rollback and frontend follow-up

Record the previous microgreens revision and secret versions; use:

```sh
gcloud run services update-traffic microgreens-api --region=asia-south1 --project=PROJECT_ID --to-revisions=PREVIOUS_REVISION=100
```

Firebase Hosting rollback is independent: restore the previous Hosting release in the
Firebase console if rewrites change. With the current unpinned rewrites, backend revision
rollback uses the Cloud Run command above.

For first deployment failure leave the current frontend on the existing lift-be URL.
For later frontend cutover rollback restore its previous two API bases and Razorpay
webhook destination, ensuring one destination; restore only the previous api DNS record
if needed. Do not delete/reseed data: both services share collections. No legacy route
removal or published history rewrite is involved. Remove unused billable resources only
after explicit approval and confirming no traffic/dependencies.

Next frontend task: consolidate catalogue and checkout base to
`https://api.microgreenskart.in/v1`; preserve query/body contracts, multipart field names,
`Idempotency-Key`, `credentials: include` for all checkout calls, server verification and
test-mode browser key. Existing host cookies cannot migrate; explain previous guest
order access and keep the legacy host usable during migration. No frontend/domain
migration is included here.

## Deployment record — 2 October 2026

Project: `lift-475112` (890845531583); region: asia-south1.
Runtime: `microgreens-api@lift-475112.iam.gserviceaccount.com`, secretAccessor on only
the five Microgreens secrets. Image repository: `microgreens` in asia-south1.
The existing compute build account was granted repository writer only on this repository.
The user chose manual deployment. Additional Cloud Build run.admin/serviceAccountUser
grants were not applied. No automatic trigger was created.

All five deployed secret bindings currently use version 1 after the Mongo secret was
recreated. To update values, add versions rather than deleting/recreating the secret;
recreation resets version IDs and secret-specific IAM. Full build config now has
explicit secret-version substitutions. The build-only config performs tests and
publishes an image without deploying a service.

Firebase API site: `microgreens-api-lift-475112`.
URL: https://microgreens-api-lift-475112.web.app/v1/growers
The default Hosting site was not overwritten. The REST deployment helper
`deploy/firebase-hosting.py` uses the current gcloud OAuth session and the project's
quota header; it never stores the token. Use `GCLOUD_BIN` to select gcloud if not on PATH.
Its `inventory`, `create`, `deploy`, `domain` and `domain-status` actions are explicit;
`deploy` affects only this site. Standard Firebase CLI deployment remains supported.

Google-generated DNS requirements retrieved from the custom domain resource:

| Type  | GoDaddy Name        | Value                                       |
| ----- | ------------------- | ------------------------------------------- |
| CNAME | api                 | microgreens-api-lift-475112.web.app         |
| TXT   | _acme-challenge.api | v419zFhgS99ou0fBvR6nhc9sXQQ4QQCqq4PkPbGGOB8 |

TTL 600 where supported. The TXT is a generated certificate challenge, not a credential.
Challenge values may change: re-read domain-status before later retries. The domain is
pending ownership/certificate validation. The user confirmed adding both DNS records;
Firebase has discovered the CNAME and certificate verification is still pending. No
DNS/email records were changed by the agent.

Live verification: growers/products lists return 200 through both run.app and Firebase;
guest order listing returns 401 without session. `/healthz` was intercepted by Google's
frontend with 404, so the final operational endpoints are `/health` and `/ready`.
The local suite passes 34 tests, including catalogue denial on both prefixes.
The original Lift generation 19, revision lift-be-00018-swb and 100% traffic were
compared before/after and are unchanged. Real payment/webhook integration and admin
management remain follow-up work; Razorpay is strictly TEST mode.

Final Cloud Run revision: `microgreens-api-00003-m86`, serving 100% traffic.
Image digest: `sha256:9391e13a707b7a8e981c312ebab59c3ccb0625c9ad6bfcbfcb2c6c725924855c`.
Firebase release: `1790941087879000` (version `56f80adbdd017181`).

## Backend test and production separation

Database selection is fixed by each deployment, never selected from browser headers.

| Environment | Cloud Run service    | API hostname                   | Mongo database  | Mongo secret               |
| ----------- | -------------------- | ------------------------------ | --------------- | -------------------------- |
| Test        | microgreens-api-test | test-api.microgreenskart.in/v1 | rides           | microgreens-test-mongo-uri |
| Production  | microgreens-api      | api.microgreenskart.in/v1      | microgreenskart | microgreens-mongo-uri      |

Both use SERVICE_MODE=microgreens and NODE_ENV=production. MICROGREENS_ENVIRONMENT
is test or production; startup validates the database path before connecting. A wrong
or missing path fails startup rather than connecting to the other environment.
Separate runtime accounts have access to their own Mongo secret and the four shared
Cloudinary/Razorpay TEST secrets. The test Mongo secret uses the existing Lift database
connection, copied privately from its deployed configuration; credentials never enter
frontend code. No catalogue or user data is copied to production. Grower guest checkout
does not expose Lift user accounts. Catalogue writes are disabled in both services;
test checkout stores test orders in rides, while production orders use microgreenskart.

Test allows https://test.microgreenskart.in, http://localhost:3000 and
http://127.0.0.1:3000 by default; production allows the production
frontend origins and excludes test.microgreenskart.in. Host-only guest cookies are scoped
to /v1 on their respective API hosts, using Firebase's __session cookie. Test max instances
is 1; production is 3; both scale to zero. Manual deployments only: build the image with
cloudbuild.microgreens-image.yaml, then run microgreens-run.py with the explicit environment
and immutable image digest. No additional Cloud Build deploy/IAM roles are needed.

Firebase API sites are separate. Run firebase-hosting.py ACTION test to operate on
microgreens-api-test-lift-475112 and test-api.microgreenskart.in; omitted environment
continues to target production. test.microgreenskart.in and microgreenskart.in are reserved
for later frontend work. Add only Google's generated test-api DNS records, preserving
production API and Zoho email DNS. Production and test currently use Razorpay TEST keys;
real payment configuration remains a separate launch task.

Frontend work was stopped at the user's clarification. Prepared frontend changes were
not pushed (automatic review rejected a main-branch push); no new frontend deployment
was published. Some Vercel test configuration/domain preparation had already occurred.
Lift's existing image/database were retained; its allowed origins were extended to include
test.microgreenskart.in in revision lift-be-00019-lk9 before the backend-only clarification.
No further Lift changes are required for these isolated API deployments.

Backend-only deployment record: build 05932ede-c9c5-4c64-b32d-190a58f28a79 passed 36 tests.
Both environments use digest sha256:41725e8f7502029b15cc398cf18a7a91695b79d3cf534be5cac3622078caab69.
Test revision microgreens-api-test-00001-59z and production revision microgreens-api-00004-85c
serve 100% traffic on their respective services. Test Hosting release 1790942668410000.
Test live reads returned 4 active growers and 16 active products from rides.

Generated test API DNS records:

| Type  | Name                     | Value                                       |
| ----- | ------------------------ | ------------------------------------------- |
| CNAME | test-api                 | microgreens-api-test-lift-475112.web.app    |
| TXT   | _acme-challenge.test-api | XqB61wXFbtC4eH9yTp2wNs1iSf2bDtIGhmfooMLrHFE |

The test API custom hostname awaits DNS/certificate verification. Re-read Firebase
requirements before later retries because challenge values can change. Test immediately
via https://microgreens-api-test-lift-475112.web.app/v1/growers.

Local development CORS: the test API permits the exact localhost/127.0.0.1 origins
on port 3000 with credentials. Other local ports require an explicit test-only
ALLOWED_FRONTEND_ORIGINS entry. Production continues to exclude all loopback origins.
Firebase has discovered both test DNS records; HTTPS certificate validation is pending.
Until ready, use https://microgreens-api-test-lift-475112.web.app/v1 as both local
frontend API bases. Cross-site browser cookie blocking can affect guest checkout even
when catalogue CORS works; verify guest sessions separately.

Localhost CORS fix deployed to test revision microgreens-api-test-00002-8h2,
image sha256:3e3ae3d0c9e4d30b3352f101f5ebdc179e1a2b4469ebf48d6e9ef9e424b1deb9.
The production revision was not updated for this fix. All 36 backend tests passed.

Grower delivery metadata update: build 645bf865-531b-4d7f-9bc7-2906d4c6872e,
image sha256:4ddb70731af10688affc506cce2f33b64c820371432d70441c412d47706cb453.
Test revision microgreens-api-test-00003-f7t; production microgreens-api-00005-xs6.
All 39 tests passed. Four rides growers were backfilled only for missing deliveryDays,
isCitywideDelivery, serviceablePincodes and websiteUrl; repeat dry run affects zero.
GreenLeaf demonstrates citywide delivery; three others cover pincode 500032.
All use weekend delivery and null website URLs until configured by their owners.
Live test list/detail fields and localhost CORS were verified. Production readiness
passed and production growers remain empty. No commits or pushes were performed.

Localhost checkout cookie fix: test service now sets GUEST_COOKIE_CROSS_SITE=true,
so localhost-origin order creation issues __session with SameSite=None; Secure;
HttpOnly; Path=/v1. Keep credentials: include on creation, verify, reconcile and
order history. Existing Lax cookies are not automatically rewritten by this setting;
third-party-cookie blocking may still require testing on test.microgreenskart.in.
Never remove guest ownership checks to address missing cookies. Existing paid orders
must be reconciled through their original session or trusted payment webhook; do not
create a duplicate payment merely to work around a missing guest session.

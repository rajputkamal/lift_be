# Micro Greens Kart transactional emails

Implementation is on main. The test email worker and schedule were deployed with user
authorization; see the deployment record below. Production email sending stays disabled.

## Create the free Resend account

1. Visit https://resend.com/signup, create your account and verify your email.
   Choose Transactional Free; no paid upgrade is needed. Current allowance: 3,000
   emails/month, 100/day, one domain. Order confirmations consume this allowance. API quota errors are retried; the daily cap can delay mail.
2. Domains -> Add domain -> `microgreenskart.in` -> select region.
   Copy the exact Resend-generated SPF, DKIM and sending/return-path MX records to
   your DNS provider. Preserve existing Zoho apex MX records and Zoho SPF/DKIM,
   Firebase/Vercel and certificate records. Resend sending MX belongs on its generated
   return-path hostname (normally `send`), never replace Zoho inbox MX.
   Do not enable Resend receiving. If a generated hostname already exists, review it
   before editing. Do not create a second SPF TXT policy at the same hostname.
   Optional DMARC changes require reviewing the existing policy first.
3. Click Verify and wait for domain status Verified. Test receiving/replying in Zoho
   at `orders@microgreenskart.in` only. Enquiry emails remain in HubSpot.
4. API Keys -> Create API key -> Sending access -> restrict to the verified domain.
   Store it privately in Google Secret Manager; never paste it in chat, source,
   frontend, logs or build substitutions. Use separate keys for test and production.

Official references: https://resend.com/pricing,
https://resend.com/docs/dashboard/domains/introduction,
https://resend.com/docs/api-reference/emails/send-email,
https://resend.com/docs/dashboard/emails/idempotency-keys.
The integration uses POST https://api.resend.com/emails with Bearer authentication,
HTML, text, reply_to and a stable Idempotency-Key. No additional SDK is necessary.

## Secret Manager and runtime configuration (operator actions after approval)

Existing project: `lift-475112`, region: `asia-south1`.
Use Google Cloud Console -> Security -> Secret Manager -> Create secret, automatic
replication, and paste the value only in the secret-value field:

| Environment | API key secret                  | Worker token secret                 | Runtime account                                          |
| ----------- | ------------------------------- | ----------------------------------- | -------------------------------------------------------- |
| production  | microgreens-resend-api-key      | microgreens-email-worker-token      | microgreens-api@lift-475112.iam.gserviceaccount.com      |
| test        | microgreens-test-resend-api-key | microgreens-test-email-worker-token | microgreens-api-test@lift-475112.iam.gserviceaccount.com |

Generate a different random worker token of at least 32 characters for each environment
(e.g. `openssl rand -hex 32`, store privately). On each secret's Permissions tab grant
Secret Manager Secret Accessor only to its matching runtime account. Record versions;
add versions for rotation rather than deleting/recreating secrets.

After building/reviewing the new image, configure the relevant Cloud Run service:
Edit & deploy new revision -> Variables & Secrets -> Reference a secret:
`RESEND_API_KEY` = corresponding API key secret, pinned version;
`EMAIL_WORKER_TOKEN` = corresponding token secret, pinned version.
Set all non-secret variables from microgreens-email.env.example, initially
`EMAIL_NOTIFICATIONS_ENABLED=false`. Retain existing Mongo, Razorpay TEST, Cloudinary,
service-mode and environment settings. Do not edit Lift or Foodie.
The deployment helpers currently use --set-env-vars/--set-secrets and can REMOVE extra
email bindings on a subsequent deployment: include these reviewed settings/bindings in
that deployment or reapply them while disabled before cutover. They were intentionally
not made dependent on secrets that do not yet exist.

## Awaited retry worker

POST `/v1/internal/email-notifications/process`, header
`Authorization: Bearer <EMAIL_WORKER_TOKEN>`, empty body. This endpoint exists only in
microgreens mode and rejects missing/short/incorrect tokens. Response:
`{success:true,data:{enabled:true,processed:3}}`; when disabled processed is zero.
Do not call it from the frontend or expose the token to customers.

Use ONE scheduling owner per environment: an existing trusted external scheduler
making this authenticated HTTPS POST every minute is sufficient. Use the same mechanism
as your existing scheduled maintenance if available, without replacing the expiration
job. Cloud Scheduler is an option, but provisioning it or any billable resources is a
separate approval step. Configure a 60-second request deadline and retry on 503;
store the Authorization header privately in that scheduler. Scheduling is required:
there is no in-process timer or unawaited work after HTTP responses. Requests finish
within roughly 50 seconds of the start of processing, with bounded provider timeouts;
Mongo network delays remain subject to hosting/request timeouts. Monitor 503 and backlog.

Mongo indexes must be ready before enabling. Inspect/create the indexes declared by
GuestOrder, against the selected
database. Run real concurrent payment and worker tests on a non-production replica set.

## Durable states and safe retries

New microgreens orders store emailEligible and saved grower deliveryDays. Captured
payments from verify/reconcile/webhook all use applyCapturedPayment. The same Mongo
transaction persists paid status and an embedded emailNotification. Each order has one
notification with event key microgreens/order-confirmation/{orderId}; no external send
occurs in payment handling. Repeated payment events preserve that record. Other service
orders and historical orders do not automatically gain notifications.

Disabled notifications, missing email and test recipients outside the allowlist produce
permanent suppressed records. Enabling later does not replay these records or old paid
orders. This prevents old HubSpot-confirmed orders receiving another confirmation.
Pending notifications pause while the global switch is off; review them before rollback
or re-enabling. Do not reset accepted/suppressed records or bulk replay historical orders.

The worker atomically claims a record with a 60-second lease and unique ownership token.
It freezes the exact payload and first-attempt time before sending. Retry uses the same
payload/key with exponential backoff (up to one hour). Crashed leases can be reclaimed.
Known permanent HTTP errors become failed; other failures become retry. Only fixed
sanitized error codes are saved. Email errors never modify paid status or call Razorpay.

Resend keys expire after 24 hours. After 23 hours from first attempt, unfinished records
become review instead of automatically risking a duplicate. Inspect Resend logs using
the key/time/recipient before deciding whether it was accepted. If accepted, record its
provider ID/status; if confirmed never accepted, an operator may approve a new send.
Never blindly reset firstAttemptAt. Monitor review/failed records and notify operators.

accepted means the API returned a message ID, NOT confirmed inbox delivery. This version
has no Resend delivery webhook; delivery/bounce confirmation is inspected in the Resend
dashboard. No automated WhatsApp integration is added.

## Confirmed ownership and frontend follow-up

Resend sends only paid-order confirmations. Enquiry capture, acknowledgements and
internal enquiry emails stay in the existing frontend/HubSpot flow. No backend
Resend enquiry endpoint or enquiry sends are enabled.

Domain verification and orders@microgreenskart.in reply handling in Zoho were
confirmed by the user. The controlled test recipient is rajput.kamal40@gmail.com;
set EMAIL_TEST_RECIPIENT_ALLOWLIST to that exact address in the test runtime.
Production uses each order's saved shipping.email; the test allowlist is not applied
when MICROGREENS_ENVIRONMENT=production. Do not redirect customer emails to the
operator address. The private API key has not been supplied/configured here.

Checkout frontend must submit the customer's actual email in shipping.email if email
confirmation is wanted (currently optional). Keep existing payment verify/reconcile and
guest credentials. No confirmation-page notification call is needed for Resend.

The user owns disabling the HubSpot order-confirmation email workflow from the frontend.
Preserve HubSpot customer/order CRM capture and all enquiry workflows. No backend CRM
writer is added, so email processing is independent of HubSpot availability.
NEXT_PUBLIC_ENABLE_TEST_NOTIFICATIONS does not gate these backend emails.

## Cutover and rollback

1. Verify Resend DNS, Zoho replies, worker schedule and indexes, with sending disabled.
2. Explicitly enable TEST and allowlist rajput.kamal40@gmail.com. Complete a Razorpay TEST
   order with that address; verify one accepted notification across verify/webhook/reconcile
   and actual delivery in Resend and the recipient inbox. Turn TEST off after testing.
3. Inspect frontend HubSpot submission/workflow. Disable only its customer-email action,
   preserving expected customer/order/enquiry CRM capture and retries.
4. Enable production EMAIL_NOTIFICATIONS_ENABLED=true, then remove the obsolete frontend
   email trigger without removing CRM capture. Keep Razorpay TEST mode throughout.
5. Verify one newly paid order produces one customer email and the expected CRM record.
6. Rollback: disable backend sending and pause the email schedule first. Inspect in-flight
   sends and pending/retry/accepted records. Re-enable HubSpot email only for new events
   after a recorded cutover boundary, excluding orders already handled or uncertain in
   Resend. Do not replay old workflows or reset backend outboxes. Resume sending only
   after resolving the pending ownership of each event.

## Validation

Automated tests use mocks; no customer emails or real provider calls are made.
Local concurrency tests verify claim semantics using a model mock, not real Mongo locking.
A replica-set integration test and controlled Resend delivery are still required before
activation. The deployment-model isolation test still allows only existing grower models.

Local verification: `npm run test:grower` passed 46/46 tests. HTTP tests required local socket access outside the filesystem sandbox. No live provider or replica-set concurrency test was performed.

## Test deployment — 5 October 2026

User authorized deploying and configuring the test email service. Production, Lift,
Foodie, Razorpay mode and HubSpot were not changed.

- Cloud Build: `50e74311-0cdd-4614-a6c2-1191a86cb8c0`, SUCCESS (46 tests).
- Image digest: `sha256:bb5e819e890c58667a4afd966e185d3f724b802ee13d68d5eae4290941818bde`.
- Test revision: `microgreens-api-test-00005-bhs`, 100% traffic.
- Previous test revision: `microgreens-api-test-00004-f84`.
- Secret: `microgreens-test-email-worker-token`, version 1, scoped accessor grant
  to `microgreens-api-test@lift-475112.iam.gserviceaccount.com`.
- Scheduler: `microgreens-test-order-emails`, asia-south1, every minute,
  Asia/Kolkata, authenticated POST to the test service's direct Cloud Run URL:
  `https://microgreens-api-test-890845531583.asia-south1.run.app/v1/internal/email-notifications/process`.
  Uses the same private token as the backend, 60s deadline, 60–300s retry backoff.
- Authenticated worker smoke test: HTTP 200, enabled false, processed 0.
- `EMAIL_NOTIFICATIONS_ENABLED=false`; allowlist `rajput.kamal40@gmail.com`.
- Resend API key value still awaited privately; no `RESEND_API_KEY` binding yet.
  Sending and real email delivery verification remain pending that configuration.

The token/header values are not recorded here. Preserve the token binding and
allowlist in future deployments, using `--update-secrets`/`--update-env-vars` to avoid
removing existing settings. Do not use the older replace-all deployment helper without
including these new bindings. No paid-order record was fabricated for the smoke test.

### Test Resend activation — 5 October 2026

The user saved RESEND_API_KEY privately in the local .env file. The value was
transferred without displaying it to `microgreens-test-resend-api-key`, version 1,
and bound to the test service with a scoped secretAccessor grant for its runtime.
Test notifications are now enabled, restricted to rajput.kamal40@gmail.com.
The authenticated worker returned HTTP 200 with enabled true and processed 0;
there were no pending order notifications at this check.

One clearly marked TEST sample email was accepted by Resend for the approved address:
provider ID `01a10d00-af47-7686-9530-9173cb2b0f18`. The sample used the user-provided
order details, explicitly stating no payment/order was created. Provider acceptance
is not confirmed inbox delivery. An actual new Razorpay TEST order is still needed
to verify the payment-to-outbox-to-scheduler path end to end. Production is unchanged.

# Guest checkout API (Razorpay Test Mode)

Checkout base URL: `/api/grower-checkout/v1`. Catalogue base URL: `/api/grower/v1`. Uses the existing Express/Mongoose backend. Razorpay test keys only. The local order is saved before the gateway order is requested. All money is integer paise in storage and gateway calls; the order response exposes INR totals and the `payment.amount` field is paise.

## Setup

1. Set the values in [`grower-checkout.env.example`](grower-checkout.env.example) in an untracked `.env` or deployment environment. Use only a `rzp_test_` key. The MVP code allows `http://localhost:3000` and `https://green-sprout-store.vercel.app`; an allowed HTTPS origin automatically receives a `SameSite=None; Secure` guest cookie. `ALLOWED_FRONTEND_ORIGINS` can add exact origins without paths or trailing slashes later.
2. Configure each grower through `PATCH /api/grower/v1/growers/:id` with `deliveryFee` (INR per delivery), `deliveryPincodes` (the exact free-delivery pincode list), and `pickupDetails` (text). Delivery outside the list uses the configured fee; an empty list means all delivery pincodes are paid. Pickup is disabled until pickup details exist.
3. Run `npm run migrate:grower` to create indexes. Transactions require a MongoDB replica set or Atlas cluster. Run `npm run cleanup:grower-orders` periodically (for example each minute) to release unpaid reservations after 15 minutes. The script processes up to 500 orders per run; repeat until backlog clears.
4. In the Razorpay **Test Mode** dashboard, enable automatic capture and configure the webhook URL `/api/grower-checkout/v1/webhooks/razorpay` with events `payment.captured` and `refund.processed`. Set the webhook secret separately. Card, netbanking and UPI method availability follows the Test Mode account/Checkout configuration.

## Browser flow

The frontend sends requests with `credentials: 'include'`. `POST /orders` requires a unique `Idempotency-Key` header (reuse the same key when retrying the same request). The response sets an unpredictable `HttpOnly` guest cookie. Subsequent list, detail, verify and reconcile calls require that cookie. A different browser or cleared cookies cannot recover orders in this minimal version. For pickup, send `shipping.name` and `shipping.phone`; email is optional. For delivery, provide name, phone, house, building, street, city, state, and a six-digit pincode; email and landmark are optional. Do not send totals.

```json
{
  "growerId": "507f191e810c19729de860ea",
  "items": [{ "productId": "507f1f77bcf86cd799439011", "quantity": 2 }],
  "purchaseType": "one-time",
  "fulfilment": "delivery",
  "firstDate": "2026-10-01",
  "shipping": {
    "name": "Test Customer",
    "phone": "9999999999",
    "email": "",
    "house": "101",
    "building": "Example Apartments",
    "street": "Sample Street",
    "landmark": "",
    "city": "Hyderabad",
    "state": "Telangana",
    "pincode": "500032"
  }
}
```

A successful `201` returns `{ "success": true, "data": { "order": { ... }, "payment": { "keyId": "rzp_test_...", "razorpayOrderId": "order_...", "amount": 27800, "currency": "INR" } } }`. Pass these payment fields to Razorpay Checkout. The frontend should support card, netbanking and UPI using Checkout; do not restrict methods in the API. After Checkout returns `razorpay_payment_id`, `razorpay_order_id`, and `razorpay_signature`, send them to `POST /orders/:id/payment/verify`. The server checks the HMAC and fetches the payment from Razorpay, requiring a captured INR payment of the expected amount. If the callback is lost, call `POST /orders/:id/payment/reconcile`; it only fetches payment status and cannot collect again.

A listed delivery pincode has no fee. An outside pincode is accepted and uses the grower's delivery fee for each scheduled delivery. A four-week subscription multiplies both the basket and applicable delivery fee by four and charges the resulting total upfront. A `202` create response with `payment: null` means gateway creation is uncertain or still in progress. Reusing the same idempotency key will not create a second gateway order. This state requires operator investigation; do not generate a new key automatically. `GET /orders` is paginated and `GET /orders/:id` gives payment status and schedule. No renewal engine is present.

## Endpoints

| Method | Path                            | Access                        |
| ------ | ------------------------------- | ----------------------------- |
| POST   | `/orders`                       | Guest; creates cookie         |
| GET    | `/orders`                       | Guest cookie                  |
| GET    | `/orders/:id`                   | Guest cookie and ownership    |
| POST   | `/orders/:id/payment/verify`    | Guest cookie and origin check |
| POST   | `/orders/:id/payment/reconcile` | Guest cookie and origin check |
| POST   | `/webhooks/razorpay`            | Raw body HMAC signature       |

Payment status is separate from the schedule. A fully refunded order is terminal and cannot return to paid from a stale event. Partial refunds and captured payments that cannot regain capacity after expiry are marked `resolution_required` for manual action. Fulfilment updates are outside this simplified MVP API.

Inventory uses each product's `stock` as capacity **per date**. Reservations are atomic MongoDB transactions and cover every scheduled date. This simple model does not handle crop batch forecasts, same-day replenishment or separate packing capacity. It blocks checkout when any date is full. Product stock cannot be reduced below existing dated reservations through product PATCH.

## References

Implementation follows Razorpay's [order creation](https://razorpay.com/docs/api/orders/create/), [signature verification](https://razorpay.com/docs/payments/server-integration/nodejs/integration-steps/), [payment fetch](https://razorpay.com/docs/api/payments/fetch-with-id/), [order payment fetch](https://razorpay.com/docs/api/payments/fetch-payments-orders/), and [webhook verification and deduplication](https://razorpay.com/docs/webhooks/validate-test/) documentation.

## Troubleshooting `503 PAYMENT_NOT_CONFIGURED`

This response comes from the local credential check before any guest session, database order, or Razorpay request is created. It is independent of the frontend origin. The running backend requires exactly `RAZORPAY_KEY_ID` (starting with `rzp_test_`) and `RAZORPAY_KEY_SECRET` (nonblank). Surrounding whitespace is trimmed. Live keys remain unsupported.

For Cloud Run, check these variables on the revision actually receiving traffic, including any traffic split. Local `.env` values do not establish what is configured in that revision. Deploy a new revision after correcting configuration. In Cloud Run logs, search for `Grower checkout payment configuration:` to see which check failed; the diagnostic contains no credential values. Do not paste secrets into logs or frontend settings. An incorrect but nonblank secret passes this check and instead fails when calling Razorpay.

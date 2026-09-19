# Postman demo: Growers, products, orders and payments

All examples use `{{baseUrl}} = http://localhost:8080/api/v1`. Import [the Postman collection](grower-postman.json); it contains these requests, example bodies, and scripts that save returned IDs. Start the backend with a MongoDB replica set/Atlas connection, run `npm run migrate:grower`, and configure **Razorpay Test Mode** keys as shown in [the environment example](grower-checkout.env.example). The collection needs no admin key or JWT.

The simplified catalogue CRUD routes are currently open to callers who can reach the API. Use this MVP setup in a controlled environment. Grower phone, email and pincode are stored for checkout but omitted from catalogue responses.

## 1. Grower CRUD

Run these in order. Replace the sample slug/email if a previous run already created them (duplicate slugs return `409`). `DELETE` is a soft delete (`isActive: false`), so do it last or reactivate with PATCH before checkout.

| Request                        | Example                                                                                                                     | Expected result                                     |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| `POST /growers`                | Body below                                                                                                                  | `201`; saves `growerId` and `growerSlug` in Postman |
| `GET /growers?page=1&limit=12` | No body                                                                                                                     | `200`; paginated list, including drafts             |
| `GET /growers/{{growerId}}`    | No body                                                                                                                     | `200`; one grower                                   |
| `PATCH /growers/{{growerId}}`  | `{"isActive":true,"deliveryFee":20,"deliveryPincodes":["500032"],"pickupDetails":"Collect at the farm counter, 9 AM–5 PM"}` | `200`; publishes and configures fulfilment          |
| `DELETE /growers/{{growerId}}` | No body                                                                                                                     | `200`; `isActive:false`                             |

`POST /growers` JSON:

```json
{
  "name": "GreenLeaf Microgreens Demo",
  "slug": "greenleaf-microgreens-demo",
  "logo": "https://res.cloudinary.com/mwxiqdif/image/upload/v1789810114/hero.jpg",
  "coverImage": "https://res.cloudinary.com/mwxiqdif/image/upload/v1789810114/hero.jpg",
  "shortDescription": "Fresh microgreens grown in Hyderabad",
  "description": "Small batches of locally grown microgreens.",
  "city": "Hyderabad",
  "area": "Gachibowli",
  "pincode": "500032",
  "phone": "9876543210",
  "email": "greenleaf-demo@example.com",
  "deliveryText": "Delivery by arrangement",
  "deliveryFee": 20,
  "deliveryPincodes": ["500032"],
  "pickupDetails": "Collect at the farm counter, 9 AM–5 PM",
  "isActive": true
}
```

## 2. Product CRUD

Create the grower first. An active product needs at least one valid HTTP(S) image. The product price is INR; the backend stores paise. `stock` is capacity **per fulfilment date**. Run DELETE last.

| Request                                               | Example                      | Expected result                            |
| ----------------------------------------------------- | ---------------------------- | ------------------------------------------ |
| `POST /products`                                      | Body below                   | `201`; saves `productId` and `productSlug` |
| `GET /products?growerId={{growerId}}&page=1&limit=12` | No body                      | `200`; paginated list                      |
| `GET /products/{{productId}}`                         | No body                      | `200`; one product                         |
| `PATCH /products/{{productId}}`                       | `{"price":109.5,"stock":20}` | `200`; only supplied fields change         |
| `DELETE /products/{{productId}}`                      | No body                      | `200`; `isActive:false`                    |

`POST /products` JSON:

```json
{
  "growerId": "{{growerId}}",
  "name": "Radish Microgreens Demo",
  "slug": "greenleaf-radish-demo",
  "shortDescription": "Crisp and slightly spicy.",
  "description": "Fresh radish microgreens with a crisp texture.",
  "price": 99,
  "weight": "50g",
  "images": [
    "https://res.cloudinary.com/mwxiqdif/image/upload/v1789810114/radish.jpg",
    "https://res.cloudinary.com/mwxiqdif/image/upload/v1789810114/hero.jpg"
  ],
  "category": "Radish",
  "cultivationDate": null,
  "harvestDate": null,
  "bestBefore": null,
  "storage": "Keep refrigerated",
  "stock": 20,
  "isActive": true
}
```

## 3. Submit and retrieve orders

Use `{{firstDate}}`, which the collection sets to tomorrow. The grower and product must both be active. For delivery, the shipping pincode must appear in `deliveryPincodes`. Postman saves the `grower_guest` HttpOnly cookie automatically for the same host. Keep using the same Postman cookie jar for `GET`, verify, and reconcile; another browser/session cannot see this order.

| Request                              | Example                                                                                                             | Expected result                                                                                          |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `POST /orders` (delivery)            | Body below; `Idempotency-Key: {{oneTimeKey}}`                                                                       | `201` with order `paymentStatus: pending`, saved `orderId`, `razorpayOrderId`, and public payment config |
| `POST /orders` (subscription pickup) | `purchaseType: subscription`, `fulfilment: pickup`, shipping `{name,phone}`; `Idempotency-Key: {{subscriptionKey}}` | `201`; four dates, one upfront amount                                                                    |
| `GET /orders?page=1&limit=12`        | Cookie required                                                                                                     | `200`; only this guest's orders                                                                          |
| `GET /orders/{{orderId}}`            | Cookie required                                                                                                     | `200`; shipping snapshot, schedule and current payment status                                            |

Delivery order JSON:

```json
{
  "growerId": "{{growerId}}",
  "items": [{ "productId": "{{productId}}", "quantity": 2 }],
  "purchaseType": "one-time",
  "fulfilment": "delivery",
  "firstDate": "{{firstDate}}",
  "shipping": {
    "name": "Test Customer",
    "phone": "9999999999",
    "email": "",
    "house": "101",
    "building": "",
    "street": "Sample Street",
    "landmark": "",
    "city": "Hyderabad",
    "state": "Telangana",
    "pincode": "500032"
  }
}
```

With two ₹99 products and ₹20 delivery, this example is ₹218 (`payment.amount: 21800` paise). The collection's product PATCH changes the price to ₹109.50, so if you run that first the actual amount is ₹239 (`23900` paise). Always use the amount returned by the API. A subscription charges the same basket and fee four times upfront.

The `Idempotency-Key` remains the same when retrying an uncertain request. Clear the collection's `oneTimeKey` or `subscriptionKey` variable to start a **new** order. A `202` response with `payment:null` means gateway creation needs operator review; it is not ready for Checkout.

## 4. Payment routes

`POST /orders` cannot accept a client supplied final payment status. It starts as `pending`; only a captured Razorpay payment verified by the backend can change it to `paid`.

| Request                                      | How to test                                                                                                                                                                    | Expected result                                                                                                                                 |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `POST /orders/{{orderId}}/payment/verify`    | After a real **Test Mode** Checkout payment, paste the Checkout callback's `razorpay_payment_id`, `razorpay_order_id`, and `razorpay_signature` into the collection variables. | `200` with `paymentStatus: paid` only if the signature and fetched payment match. Fake values produce `400`.                                    |
| `POST /orders/{{orderId}}/payment/reconcile` | Send `{}` after a Test Mode payment, including when the callback was lost.                                                                                                     | `200` with current payment status; does not collect money.                                                                                      |
| `POST /webhooks/razorpay`                    | Configure and send a Test Mode webhook from the Razorpay dashboard to a reachable backend URL.                                                                                 | `200` only for a correctly signed raw event. The Postman placeholder request returns `403` by design; do not put the webhook secret in Postman. |

Verify body:

```json
{
  "razorpay_payment_id": "{{razorpayPaymentId}}",
  "razorpay_order_id": "{{razorpayOrderId}}",
  "razorpay_signature": "{{razorpaySignature}}"
}
```

To exercise `verify` successfully, complete a Test Mode payment through Razorpay Checkout using the `payment` object returned from `POST /orders`. Postman alone cannot produce a genuine Checkout callback. You can still test its invalid-signature response in Postman, and use `reconcile` after the Test Mode payment. The webhook endpoint is for Razorpay's server-to-server request.

## Error checks

- Try `POST /products` with `price: 1.234` → `400 VALIDATION_ERROR`.
- Try `POST /orders` with a client `total: 1` → `400 VALIDATION_ERROR`; totals are computed server side.
- Try an unsupported delivery pincode → `400 DELIVERY_UNAVAILABLE`.
- Retry an order with the same idempotency key and changed items → `409 IDEMPOTENCY_CONFLICT`.
- Clear the Postman guest cookie and call `GET /orders/{{orderId}}` → `401 GUEST_SESSION_REQUIRED`.

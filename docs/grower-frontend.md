# Grower catalogue frontend integration

Catalogue base path: `/api/grower/v1`. Checkout base path: `/api/grower-checkout/v1`. The catalogue exposes direct CRUD routes on `/growers` and `/products`. The guest order routes use an HttpOnly cookie scoped to the checkout base path.

- `GET /growers?page=1&limit=12&search=green` returns `{success:true,data:[grower],pagination}`.
- `GET /growers/:id` returns `{success:true,data:grower}`.
- `GET /products?growerId=<id>&page=1&limit=12&search=radish` returns `{success:true,data:[product],pagination}`. Iterate pages; page one is not the complete catalogue.
- `GET /products/:id` returns `{success:true,data:product}`.

Example response from `GET /products/:id`:

```json
{"success":true,"data":{"id":"507f1f77bcf86cd799439011","growerId":"507f191e810c19729de860ea","name":"Radish Microgreens","slug":"greenleaf-radish-microgreens","shortDescription":"Crisp and spicy","description":"Fresh radish microgreens.","price":99,"weight":"50g","thumbnail":"https://res.cloudinary.com/mwxiqdif/image/upload/v1789810114/radish.jpg","images":["https://res.cloudinary.com/mwxiqdif/image/upload/v1789810114/radish.jpg"],"category":"Radish","cultivationDate":null,"harvestDate":null,"bestBefore":null,"storage":"Keep refrigerated","stock":20,"isActive":true}}}
```

Unwrap `data` from the response envelope. Render grower `logo` as an image URL with an initials fallback when null. Hide `rating` while it is null. Only format batch dates when present; do not render invalid placeholders. `thumbnail` comes from `images[0]`. Keep active products with `stock: 0` visible as “Sold out.”

The backend accepts product `price` in INR and stores integer paise. Product dates describe the current listed batch only. Checkout enforces a single grower per order. This task does not connect the Next.js frontend. Direct catalogue CRUD currently has no authentication, so only use this MVP configuration in a controlled environment.

## Populated order response

Order item fields are backend snapshots captured when the order is created. `unitPrice` is INR and `thumbnail` may be null.

```json
{
  "success": true,
  "data": {
    "id": "66eaec4ce8a9d62a75b10421",
    "growerId": "66eaebbc8a9d62a75b103f1",
    "growerName": "GreenLeaf Microgreens",
    "purchaseType": "one-time",
    "fulfilment": "delivery",
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
    },
    "pickupDetails": null,
    "items": [
      {
        "productId": "66eaec0b8a9d62a75b10408",
        "name": "Radish Microgreens",
        "slug": "radish-microgreens-1",
        "quantity": 2,
        "unitPrice": 99,
        "weight": "50g",
        "thumbnail": "https://res.cloudinary.com/mwxiqdif/image/upload/v1789810114/radish.jpg"
      }
    ],
    "schedule": [
      {
        "id": "66eaec4ce8a9d62a75b10422",
        "date": "2026-09-20",
        "status": "scheduled"
      }
    ],
    "basketTotal": 198,
    "deliveryFee": 20,
    "total": 218,
    "currency": "INR",
    "paymentStatus": "paid",
    "razorpayOrderId": "order_test_example",
    "reservationExpiresAt": "2026-09-19T12:15:00.000Z",
    "createdAt": "2026-09-19T12:00:00.000Z",
    "updatedAt": "2026-09-19T12:02:00.000Z"
  }
}
```

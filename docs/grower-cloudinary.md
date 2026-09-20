# Cloudinary image handling

Set the complete Cloudinary environment variable on the backend only:

```env
CLOUDINARY_URL=cloudinary://API_KEY:API_SECRET@mwxiqdif
```

Never expose the API secret to frontend code. The API stores the returned Cloudinary HTTPS URL in MongoDB, so normal `GET /growers` and `GET /products` responses already contain the CDN URL.

Existing JSON requests remain supported. Send `logo`, `coverImage`, or `images` as HTTP(S) URL strings as before.

For a future dashboard, use `multipart/form-data`:

- `POST /api/grower/v1/growers`: optional file fields `logo` and `coverImage`, one file each.
- `POST /api/grower/v1/products`: file field `images`, repeated in the desired display order, with 1–8 files required when the product is active.
- All remaining properties are text form fields. Send `deliveryPincodes` and URL-based `images` as JSON array strings. Send `isActive` as `true` or `false`.
- Accepted formats are JPEG, PNG, WebP, and AVIF, with a 5 MB limit per file.
- A request must use either uploaded files or URL values for the same image field, not both.

Example product upload:

```bash
curl --request POST "http://localhost:5100/api/grower/v1/products" \
  --form "growerId=YOUR_GROWER_ID" \
  --form "name=Radish Microgreens" \
  --form "slug=radish-microgreens-upload" \
  --form "shortDescription=Crisp and slightly spicy." \
  --form "description=Fresh radish microgreens." \
  --form "price=99" \
  --form "weight=50g" \
  --form "category=Radish" \
  --form "storage=Keep refrigerated" \
  --form "stock=20" \
  --form "isActive=true" \
  --form "images=@/absolute/path/radish-1.jpg" \
  --form "images=@/absolute/path/radish-2.jpg"
```

If database creation or validation fails after an upload, the API attempts to remove the newly uploaded Cloudinary assets. Catalogue DELETE remains a database soft delete and does not delete Cloudinary assets.

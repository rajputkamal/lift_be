#!/usr/bin/env bash
set -euo pipefail

API_BASE_URL="${API_BASE_URL:-http://localhost:5100/api/v1}"
FRONTEND_BASE_URL="${FRONTEND_BASE_URL:-http://localhost:3000}"

post_json() {
  local endpoint="$1"
  local payload="$2"
  curl --silent --show-error --fail-with-body \
    --request POST \
    --header "Content-Type: application/json" \
    --data "$payload" \
    "${API_BASE_URL}/${endpoint}"
}

extract_id() {
  node -e 'let input=""; process.stdin.on("data", c => input += c); process.stdin.on("end", () => { const result=JSON.parse(input); if (!result.success || !result.data?.id) { console.error(input); process.exit(1); } process.stdout.write(result.data.id); });'
}

echo "Creating growers at ${API_BASE_URL}..."

grower_response_1=$(post_json growers "{\"name\":\"GreenLeaf Microgreens\",\"slug\":\"greenleaf-microgreens\",\"logo\":null,\"coverImage\":\"${FRONTEND_BASE_URL}/images/hero.jpg\",\"shortDescription\":\"Fresh pesticide-free microgreens, lovingly grown and harvested in small batches.\",\"description\":\"Fresh pesticide-free microgreens, lovingly grown and harvested in small batches. We grow close to home, using careful cultivation and small-batch harvesting. Meet your new neighbourhood grower.\",\"city\":\"Hyderabad\",\"area\":\"Gachibowli\",\"pincode\":\"500032\",\"phone\":\"9876543210\",\"email\":\"greenleaf-microgreens@example.com\",\"deliveryText\":\"Delivery in 24–48 hours\",\"deliveryFee\":20,\"deliveryPincodes\":[\"500032\"],\"pickupDetails\":\"Pickup from Gachibowli, Hyderabad, between 9 AM and 5 PM\",\"isActive\":true}")
GROWER_ID_1=$(printf '%s' "$grower_response_1" | extract_id)
echo "Created GreenLeaf Microgreens: $GROWER_ID_1"

grower_response_2=$(post_json growers "{\"name\":\"Urban Harvest\",\"slug\":\"urban-harvest\",\"logo\":null,\"coverImage\":\"${FRONTEND_BASE_URL}/images/sunflower.jpg\",\"shortDescription\":\"A little urban farm with a big love for clean, sustainable growing.\",\"description\":\"A little urban farm with a big love for clean, sustainable growing. We grow close to home, using careful cultivation and small-batch harvesting. Meet your new neighbourhood grower.\",\"city\":\"Hyderabad\",\"area\":\"Kondapur\",\"pincode\":\"500032\",\"phone\":\"9876543211\",\"email\":\"urban-harvest@example.com\",\"deliveryText\":\"Delivery in 24–48 hours\",\"deliveryFee\":20,\"deliveryPincodes\":[\"500032\"],\"pickupDetails\":\"Pickup from Kondapur, Hyderabad, between 9 AM and 5 PM\",\"isActive\":true}")
GROWER_ID_2=$(printf '%s' "$grower_response_2" | extract_id)
echo "Created Urban Harvest: $GROWER_ID_2"

grower_response_3=$(post_json growers "{\"name\":\"Fresh Roots Farm\",\"slug\":\"fresh-roots-farm\",\"logo\":null,\"coverImage\":\"${FRONTEND_BASE_URL}/images/pea-shoots.jpg\",\"shortDescription\":\"Family-grown greens. Honest practices. Freshness you can taste.\",\"description\":\"Family-grown greens. Honest practices. Freshness you can taste. We grow close to home, using careful cultivation and small-batch harvesting. Meet your new neighbourhood grower.\",\"city\":\"Hyderabad\",\"area\":\"Tellapur\",\"pincode\":\"500032\",\"phone\":\"9876543212\",\"email\":\"fresh-roots-farm@example.com\",\"deliveryText\":\"Delivery in 24–48 hours\",\"deliveryFee\":20,\"deliveryPincodes\":[\"500032\"],\"pickupDetails\":\"Pickup from Tellapur, Hyderabad, between 9 AM and 5 PM\",\"isActive\":true}")
GROWER_ID_3=$(printf '%s' "$grower_response_3" | extract_id)
echo "Created Fresh Roots Farm: $GROWER_ID_3"

grower_response_4=$(post_json growers "{\"name\":\"Sprout Valley\",\"slug\":\"sprout-valley\",\"logo\":null,\"coverImage\":\"${FRONTEND_BASE_URL}/images/broccoli.jpg\",\"shortDescription\":\"Thoughtfully grown little greens for your everyday feel-good meals.\",\"description\":\"Thoughtfully grown little greens for your everyday feel-good meals. We grow close to home, using careful cultivation and small-batch harvesting. Meet your new neighbourhood grower.\",\"city\":\"Hyderabad\",\"area\":\"Manikonda\",\"pincode\":\"500032\",\"phone\":\"9876543213\",\"email\":\"sprout-valley@example.com\",\"deliveryText\":\"Delivery in 24–48 hours\",\"deliveryFee\":20,\"deliveryPincodes\":[\"500032\"],\"pickupDetails\":\"Pickup from Manikonda, Hyderabad, between 9 AM and 5 PM\",\"isActive\":true}")
GROWER_ID_4=$(printf '%s' "$grower_response_4" | extract_id)
echo "Created Sprout Valley: $GROWER_ID_4"

echo "Creating products..."

product_response_1=$(post_json products "{\"growerId\":\"${GROWER_ID_1}\",\"name\":\"Radish Microgreens\",\"slug\":\"radish-microgreens-1\",\"shortDescription\":\"Peppery, vibrant and full of character.\",\"description\":\"Peppery, vibrant and full of character. Grown locally in small batches and carefully packed to keep every leaf fresh. Perfect for salads, sandwiches, wraps and finishing your favourite dishes.\",\"price\":99,\"category\":\"Radish\",\"weight\":\"50g\",\"images\":[\"${FRONTEND_BASE_URL}/images/radish.jpg\",\"${FRONTEND_BASE_URL}/images/radish.jpg\",\"${FRONTEND_BASE_URL}/images/hero.jpg\"],\"cultivationDate\":\"2026-09-05\",\"harvestDate\":\"2026-09-12\",\"bestBefore\":\"2026-09-15\",\"storage\":\"Keep refrigerated at 2–5°C. Rinse before use.\",\"stock\":20,\"isActive\":true}")
PRODUCT_ID_1=$(printf '%s' "$product_response_1" | extract_id)
echo "Created Radish Microgreens: $PRODUCT_ID_1"

product_response_2=$(post_json products "{\"growerId\":\"${GROWER_ID_1}\",\"name\":\"Sunflower Microgreens\",\"slug\":\"sunflower-microgreens-1\",\"shortDescription\":\"A nutty crunch for your everyday bowl.\",\"description\":\"A nutty crunch for your everyday bowl. Grown locally in small batches and carefully packed to keep every leaf fresh. Perfect for salads, sandwiches, wraps and finishing your favourite dishes.\",\"price\":119,\"category\":\"Sunflower\",\"weight\":\"50g\",\"images\":[\"${FRONTEND_BASE_URL}/images/sunflower.jpg\",\"${FRONTEND_BASE_URL}/images/sunflower.jpg\",\"${FRONTEND_BASE_URL}/images/hero.jpg\"],\"cultivationDate\":\"2026-09-05\",\"harvestDate\":\"2026-09-12\",\"bestBefore\":\"2026-09-15\",\"storage\":\"Keep refrigerated at 2–5°C. Rinse before use.\",\"stock\":20,\"isActive\":true}")
PRODUCT_ID_2=$(printf '%s' "$product_response_2" | extract_id)
echo "Created Sunflower Microgreens: $PRODUCT_ID_2"

product_response_3=$(post_json products "{\"growerId\":\"${GROWER_ID_1}\",\"name\":\"Mustard Microgreens\",\"slug\":\"mustard-microgreens-1\",\"shortDescription\":\"A little green with a delicious kick.\",\"description\":\"A little green with a delicious kick. Grown locally in small batches and carefully packed to keep every leaf fresh. Perfect for salads, sandwiches, wraps and finishing your favourite dishes.\",\"price\":99,\"category\":\"Mustard\",\"weight\":\"50g\",\"images\":[\"${FRONTEND_BASE_URL}/images/mustard.jpg\",\"${FRONTEND_BASE_URL}/images/mustard.jpg\",\"${FRONTEND_BASE_URL}/images/hero.jpg\"],\"cultivationDate\":\"2026-09-05\",\"harvestDate\":\"2026-09-12\",\"bestBefore\":\"2026-09-15\",\"storage\":\"Keep refrigerated at 2–5°C. Rinse before use.\",\"stock\":20,\"isActive\":true}")
PRODUCT_ID_3=$(printf '%s' "$product_response_3" | extract_id)
echo "Created Mustard Microgreens: $PRODUCT_ID_3"

product_response_4=$(post_json products "{\"growerId\":\"${GROWER_ID_1}\",\"name\":\"Pea Shoots\",\"slug\":\"pea-shoots-1\",\"shortDescription\":\"Sweet, tender and freshly picked.\",\"description\":\"Sweet, tender and freshly picked. Grown locally in small batches and carefully packed to keep every leaf fresh. Perfect for salads, sandwiches, wraps and finishing your favourite dishes.\",\"price\":119,\"category\":\"Pea Shoots\",\"weight\":\"50g\",\"images\":[\"${FRONTEND_BASE_URL}/images/pea-shoots.jpg\",\"${FRONTEND_BASE_URL}/images/pea-shoots.jpg\",\"${FRONTEND_BASE_URL}/images/hero.jpg\"],\"cultivationDate\":\"2026-09-05\",\"harvestDate\":\"2026-09-12\",\"bestBefore\":\"2026-09-15\",\"storage\":\"Keep refrigerated at 2–5°C. Rinse before use.\",\"stock\":20,\"isActive\":true}")
PRODUCT_ID_4=$(printf '%s' "$product_response_4" | extract_id)
echo "Created Pea Shoots: $PRODUCT_ID_4"

product_response_5=$(post_json products "{\"growerId\":\"${GROWER_ID_1}\",\"name\":\"Broccoli Microgreens\",\"slug\":\"broccoli-microgreens-1\",\"shortDescription\":\"Mild, delicate greens for everyday goodness.\",\"description\":\"Mild, delicate greens for everyday goodness. Grown locally in small batches and carefully packed to keep every leaf fresh. Perfect for salads, sandwiches, wraps and finishing your favourite dishes.\",\"price\":129,\"category\":\"Broccoli\",\"weight\":\"50g\",\"images\":[\"${FRONTEND_BASE_URL}/images/broccoli.jpg\",\"${FRONTEND_BASE_URL}/images/broccoli.jpg\",\"${FRONTEND_BASE_URL}/images/hero.jpg\"],\"cultivationDate\":\"2026-09-05\",\"harvestDate\":\"2026-09-12\",\"bestBefore\":\"2026-09-15\",\"storage\":\"Keep refrigerated at 2–5°C. Rinse before use.\",\"stock\":20,\"isActive\":true}")
PRODUCT_ID_5=$(printf '%s' "$product_response_5" | extract_id)
echo "Created Broccoli Microgreens: $PRODUCT_ID_5"

product_response_6=$(post_json products "{\"growerId\":\"${GROWER_ID_2}\",\"name\":\"Red Radish\",\"slug\":\"red-radish-2\",\"shortDescription\":\"Bright stems with a peppery finish.\",\"description\":\"Bright stems with a peppery finish. Grown locally in small batches and carefully packed to keep every leaf fresh. Perfect for salads, sandwiches, wraps and finishing your favourite dishes.\",\"price\":109,\"category\":\"Radish\",\"weight\":\"50g\",\"images\":[\"${FRONTEND_BASE_URL}/images/radish.jpg\",\"${FRONTEND_BASE_URL}/images/radish.jpg\",\"${FRONTEND_BASE_URL}/images/hero.jpg\"],\"cultivationDate\":\"2026-09-05\",\"harvestDate\":\"2026-09-12\",\"bestBefore\":\"2026-09-15\",\"storage\":\"Keep refrigerated at 2–5°C. Rinse before use.\",\"stock\":20,\"isActive\":true}")
PRODUCT_ID_6=$(printf '%s' "$product_response_6" | extract_id)
echo "Created Red Radish: $PRODUCT_ID_6"

product_response_7=$(post_json products "{\"growerId\":\"${GROWER_ID_2}\",\"name\":\"Fenugreek Microgreens\",\"slug\":\"fenugreek-microgreens-2\",\"shortDescription\":\"Familiar methi flavour, tender little leaves.\",\"description\":\"Familiar methi flavour, tender little leaves. Grown locally in small batches and carefully packed to keep every leaf fresh. Perfect for salads, sandwiches, wraps and finishing your favourite dishes.\",\"price\":89,\"category\":\"Fenugreek\",\"weight\":\"50g\",\"images\":[\"${FRONTEND_BASE_URL}/images/fenugreek.jpg\",\"${FRONTEND_BASE_URL}/images/fenugreek.jpg\",\"${FRONTEND_BASE_URL}/images/hero.jpg\"],\"cultivationDate\":\"2026-09-05\",\"harvestDate\":\"2026-09-12\",\"bestBefore\":\"2026-09-15\",\"storage\":\"Keep refrigerated at 2–5°C. Rinse before use.\",\"stock\":20,\"isActive\":true}")
PRODUCT_ID_7=$(printf '%s' "$product_response_7" | extract_id)
echo "Created Fenugreek Microgreens: $PRODUCT_ID_7"

product_response_8=$(post_json products "{\"growerId\":\"${GROWER_ID_2}\",\"name\":\"Amaranth Microgreens\",\"slug\":\"amaranth-microgreens-2\",\"shortDescription\":\"Beautiful crimson leaves, earthy flavour.\",\"description\":\"Beautiful crimson leaves, earthy flavour. Grown locally in small batches and carefully packed to keep every leaf fresh. Perfect for salads, sandwiches, wraps and finishing your favourite dishes.\",\"price\":119,\"category\":\"Amaranth\",\"weight\":\"50g\",\"images\":[\"${FRONTEND_BASE_URL}/images/amaranth.jpg\",\"${FRONTEND_BASE_URL}/images/amaranth.jpg\",\"${FRONTEND_BASE_URL}/images/hero.jpg\"],\"cultivationDate\":\"2026-09-05\",\"harvestDate\":\"2026-09-12\",\"bestBefore\":\"2026-09-15\",\"storage\":\"Keep refrigerated at 2–5°C. Rinse before use.\",\"stock\":20,\"isActive\":true}")
PRODUCT_ID_8=$(printf '%s' "$product_response_8" | extract_id)
echo "Created Amaranth Microgreens: $PRODUCT_ID_8"

product_response_9=$(post_json products "{\"growerId\":\"${GROWER_ID_2}\",\"name\":\"Mixed Greens Box\",\"slug\":\"mixed-greens-box-2\",\"shortDescription\":\"A colourful selection of our daily harvest.\",\"description\":\"A colourful selection of our daily harvest. Grown locally in small batches and carefully packed to keep every leaf fresh. Perfect for salads, sandwiches, wraps and finishing your favourite dishes.\",\"price\":249,\"category\":\"Mixed Greens\",\"weight\":\"150g\",\"images\":[\"${FRONTEND_BASE_URL}/images/hero.jpg\",\"${FRONTEND_BASE_URL}/images/hero.jpg\",\"${FRONTEND_BASE_URL}/images/hero.jpg\"],\"cultivationDate\":\"2026-09-05\",\"harvestDate\":\"2026-09-12\",\"bestBefore\":\"2026-09-15\",\"storage\":\"Keep refrigerated at 2–5°C. Rinse before use.\",\"stock\":20,\"isActive\":true}")
PRODUCT_ID_9=$(printf '%s' "$product_response_9" | extract_id)
echo "Created Mixed Greens Box: $PRODUCT_ID_9"

product_response_10=$(post_json products "{\"growerId\":\"${GROWER_ID_3}\",\"name\":\"Sunflower Shoots\",\"slug\":\"sunflower-shoots-3\",\"shortDescription\":\"Fresh, nutty and satisfyingly crunchy.\",\"description\":\"Fresh, nutty and satisfyingly crunchy. Grown locally in small batches and carefully packed to keep every leaf fresh. Perfect for salads, sandwiches, wraps and finishing your favourite dishes.\",\"price\":119,\"category\":\"Sunflower\",\"weight\":\"50g\",\"images\":[\"${FRONTEND_BASE_URL}/images/sunflower.jpg\",\"${FRONTEND_BASE_URL}/images/sunflower.jpg\",\"${FRONTEND_BASE_URL}/images/hero.jpg\"],\"cultivationDate\":\"2026-09-05\",\"harvestDate\":\"2026-09-12\",\"bestBefore\":\"2026-09-15\",\"storage\":\"Keep refrigerated at 2–5°C. Rinse before use.\",\"stock\":20,\"isActive\":true}")
PRODUCT_ID_10=$(printf '%s' "$product_response_10" | extract_id)
echo "Created Sunflower Shoots: $PRODUCT_ID_10"

product_response_11=$(post_json products "{\"growerId\":\"${GROWER_ID_3}\",\"name\":\"Pea Shoots\",\"slug\":\"pea-shoots-3\",\"shortDescription\":\"Naturally sweet, tender shoots.\",\"description\":\"Naturally sweet, tender shoots. Grown locally in small batches and carefully packed to keep every leaf fresh. Perfect for salads, sandwiches, wraps and finishing your favourite dishes.\",\"price\":119,\"category\":\"Pea Shoots\",\"weight\":\"50g\",\"images\":[\"${FRONTEND_BASE_URL}/images/pea-shoots.jpg\",\"${FRONTEND_BASE_URL}/images/pea-shoots.jpg\",\"${FRONTEND_BASE_URL}/images/hero.jpg\"],\"cultivationDate\":\"2026-09-05\",\"harvestDate\":\"2026-09-12\",\"bestBefore\":\"2026-09-15\",\"storage\":\"Keep refrigerated at 2–5°C. Rinse before use.\",\"stock\":20,\"isActive\":true}")
PRODUCT_ID_11=$(printf '%s' "$product_response_11" | extract_id)
echo "Created Pea Shoots: $PRODUCT_ID_11"

product_response_12=$(post_json products "{\"growerId\":\"${GROWER_ID_3}\",\"name\":\"Mustard Greens\",\"slug\":\"mustard-greens-3\",\"shortDescription\":\"Bring a little heat to your next meal.\",\"description\":\"Bring a little heat to your next meal. Grown locally in small batches and carefully packed to keep every leaf fresh. Perfect for salads, sandwiches, wraps and finishing your favourite dishes.\",\"price\":99,\"category\":\"Mustard\",\"weight\":\"50g\",\"images\":[\"${FRONTEND_BASE_URL}/images/mustard.jpg\",\"${FRONTEND_BASE_URL}/images/mustard.jpg\",\"${FRONTEND_BASE_URL}/images/hero.jpg\"],\"cultivationDate\":\"2026-09-05\",\"harvestDate\":\"2026-09-12\",\"bestBefore\":\"2026-09-15\",\"storage\":\"Keep refrigerated at 2–5°C. Rinse before use.\",\"stock\":20,\"isActive\":true}")
PRODUCT_ID_12=$(printf '%s' "$product_response_12" | extract_id)
echo "Created Mustard Greens: $PRODUCT_ID_12"

product_response_13=$(post_json products "{\"growerId\":\"${GROWER_ID_3}\",\"name\":\"Wellness Mix\",\"slug\":\"wellness-mix-3\",\"shortDescription\":\"A fresh mix for a brighter daily bowl.\",\"description\":\"A fresh mix for a brighter daily bowl. Grown locally in small batches and carefully packed to keep every leaf fresh. Perfect for salads, sandwiches, wraps and finishing your favourite dishes.\",\"price\":229,\"category\":\"Mixed Greens\",\"weight\":\"150g\",\"images\":[\"${FRONTEND_BASE_URL}/images/broccoli.jpg\",\"${FRONTEND_BASE_URL}/images/broccoli.jpg\",\"${FRONTEND_BASE_URL}/images/hero.jpg\"],\"cultivationDate\":\"2026-09-05\",\"harvestDate\":\"2026-09-12\",\"bestBefore\":\"2026-09-15\",\"storage\":\"Keep refrigerated at 2–5°C. Rinse before use.\",\"stock\":20,\"isActive\":true}")
PRODUCT_ID_13=$(printf '%s' "$product_response_13" | extract_id)
echo "Created Wellness Mix: $PRODUCT_ID_13"

product_response_14=$(post_json products "{\"growerId\":\"${GROWER_ID_4}\",\"name\":\"Basil Microgreens\",\"slug\":\"basil-microgreens-4\",\"shortDescription\":\"Tiny leaves with a beautifully bold aroma.\",\"description\":\"Tiny leaves with a beautifully bold aroma. Grown locally in small batches and carefully packed to keep every leaf fresh. Perfect for salads, sandwiches, wraps and finishing your favourite dishes.\",\"price\":149,\"category\":\"Basil\",\"weight\":\"50g\",\"images\":[\"${FRONTEND_BASE_URL}/images/basil.jpg\",\"${FRONTEND_BASE_URL}/images/basil.jpg\",\"${FRONTEND_BASE_URL}/images/hero.jpg\"],\"cultivationDate\":\"2026-09-05\",\"harvestDate\":\"2026-09-12\",\"bestBefore\":\"2026-09-15\",\"storage\":\"Keep refrigerated at 2–5°C. Rinse before use.\",\"stock\":20,\"isActive\":true}")
PRODUCT_ID_14=$(printf '%s' "$product_response_14" | extract_id)
echo "Created Basil Microgreens: $PRODUCT_ID_14"

product_response_15=$(post_json products "{\"growerId\":\"${GROWER_ID_4}\",\"name\":\"Beetroot Microgreens\",\"slug\":\"beetroot-microgreens-4\",\"shortDescription\":\"Earthy sweetness and pretty pink stems.\",\"description\":\"Earthy sweetness and pretty pink stems. Grown locally in small batches and carefully packed to keep every leaf fresh. Perfect for salads, sandwiches, wraps and finishing your favourite dishes.\",\"price\":139,\"category\":\"Beetroot\",\"weight\":\"50g\",\"images\":[\"${FRONTEND_BASE_URL}/images/beet.jpg\",\"${FRONTEND_BASE_URL}/images/beet.jpg\",\"${FRONTEND_BASE_URL}/images/hero.jpg\"],\"cultivationDate\":\"2026-09-05\",\"harvestDate\":\"2026-09-12\",\"bestBefore\":\"2026-09-15\",\"storage\":\"Keep refrigerated at 2–5°C. Rinse before use.\",\"stock\":0,\"isActive\":true}")
PRODUCT_ID_15=$(printf '%s' "$product_response_15" | extract_id)
echo "Created Beetroot Microgreens: $PRODUCT_ID_15"

product_response_16=$(post_json products "{\"growerId\":\"${GROWER_ID_4}\",\"name\":\"Pea Shoots\",\"slug\":\"pea-shoots-4\",\"shortDescription\":\"Sweet, tender and full of freshness.\",\"description\":\"Sweet, tender and full of freshness. Grown locally in small batches and carefully packed to keep every leaf fresh. Perfect for salads, sandwiches, wraps and finishing your favourite dishes.\",\"price\":119,\"category\":\"Pea Shoots\",\"weight\":\"50g\",\"images\":[\"${FRONTEND_BASE_URL}/images/pea-shoots.jpg\",\"${FRONTEND_BASE_URL}/images/pea-shoots.jpg\",\"${FRONTEND_BASE_URL}/images/hero.jpg\"],\"cultivationDate\":\"2026-09-05\",\"harvestDate\":\"2026-09-12\",\"bestBefore\":\"2026-09-15\",\"storage\":\"Keep refrigerated at 2–5°C. Rinse before use.\",\"stock\":20,\"isActive\":true}")
PRODUCT_ID_16=$(printf '%s' "$product_response_16" | extract_id)
echo "Created Pea Shoots: $PRODUCT_ID_16"

echo
echo "Seed complete: 4 growers and 16 products created."
echo "Test growers: ${API_BASE_URL}/growers"
echo "Test first grower products: ${API_BASE_URL}/products?growerId=${GROWER_ID_1}"

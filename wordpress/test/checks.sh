#!/bin/sh
# Runs every plugin check against the site setup.sh built. Exits 1 on any failure.
#   sh wordpress/test/setup.sh && sh wordpress/test/checks.sh
REPO=$(cd "$(dirname "$0")/../.." && pwd)
D=${WP_TEST_DIR:-/tmp/ps-wp-test}
W="php $D/wp-cli.phar --allow-root --path=$D/wordpress"
cp "$REPO/wordpress/peptide-store.php" "$D/wordpress/wp-content/mu-plugins/"
fail=0
$W eval-file "$REPO/wordpress/test/checks.php" 2>/dev/null || fail=1
cd "$REPO"
node wordpress/test/browser.mjs || fail=1
BLOCK=$($W option get woocommerce_checkout_page_id)
$W option update woocommerce_checkout_page_id "$($W eval 'echo get_option("ps_test_ids")["classic_checkout"];')" >/dev/null
CHECKOUT=classic node wordpress/test/browser.mjs || fail=1
$W option update woocommerce_checkout_page_id "$BLOCK" >/dev/null
CHECKOUT=block node wordpress/test/browser.mjs || fail=1
# The block checkout's server side must refuse an order with no acknowledgment, even bypassing the page.
B=http://127.0.0.1:8099/wp-json/wc/store/v1
H=$(curl -s -D - -o /dev/null $B/cart); N=$(echo "$H" | awk 'tolower($1)=="nonce:"{print $2}' | tr -d '\r'); T=$(echo "$H" | awk 'tolower($1)=="cart-token:"{print $2}' | tr -d '\r')
VID=$($W eval 'echo wc_get_product(get_option("ps_test_ids")["bpc"])->get_children()[0];')
curl -s -H "Nonce: $N" -H "Cart-Token: $T" -H 'Content-Type: application/json' -d "{\"id\":$VID,\"quantity\":1}" $B/cart/add-item -o /dev/null
A='{"first_name":"Eve","last_name":"X","address_1":"1 Main","city":"Tulsa","state":"OK","postcode":"74101","country":"US","email":"eve@example.com","phone":"5555555555"}'
CODE=$(curl -s -o /dev/null -w '%{http_code}' -H "Nonce: $N" -H "Cart-Token: $T" -H 'Content-Type: application/json' -d "{\"billing_address\":$A,\"shipping_address\":$A,\"payment_method\":\"cod\",\"additional_fields\":{\"peptide-store/ruo-ack\":false}}" $B/checkout)
if [ "$CODE" = 400 ]; then echo "PASS Store API refuses a block checkout with the box unticked"; else echo "FAIL Store API accepted an unacknowledged order ($CODE)"; fail=1; fi
# Nothing may fatal with WooCommerce or Rank Math switched off.
: > "$D/server.log"
for plugin in woocommerce seo-by-rank-math; do
  $W plugin deactivate $plugin >/dev/null 2>&1
  for u in / /product/bpc-157/; do curl -s -o /dev/null "http://127.0.0.1:8099$u"; done
  $W plugin activate $plugin >/dev/null 2>&1
done
if grep -a -i fatal "$D/server.log" | grep -q peptide-store; then echo "FAIL plugin fatals with a dependency switched off"; grep -a -i fatal "$D/server.log" | grep peptide-store | head -3; fail=1; else echo "PASS no fatal errors with WooCommerce or Rank Math switched off"; fi
if grep -a -iE 'warning|deprecated' "$D/server.log" | grep -q peptide-store; then echo "FAIL plugin raised PHP warnings"; fail=1; fi
[ $fail = 0 ] && echo "\nAll plugin checks pass." || echo "\nSome plugin checks failed."
exit $fail

<?php
// Server-side checks against the site setup.sh builds. Run via checks.sh.
$ids  = get_option( 'ps_test_ids' );
$base = 'http://127.0.0.1:8099';
$fail = 0;
$ok   = function ( $cond, $what ) use ( &$fail ) { echo ( $cond ? 'PASS ' : 'FAIL ' ), $what, "\n"; $fail += $cond ? 0 : 1; };
$get  = fn( $path ) => wp_remote_retrieve_body( wp_remote_get( $base . $path, [ 'timeout' => 30 ] ) );

/* Product page */
$html = $get( '/product/bpc-157/' );
$ok( ! str_contains( $html, 'target COA-verified purity' ), 'FAQ placeholder "(target COA-verified purity)" removed' );
$ok( str_contains( $html, '.product.outofstock .hbl-delivery-countdown{display:none}' ), 'out-of-stock countdown CSS printed' );
$ok( (bool) preg_match( '/<img[^>]+alt="BPC-157"/', $html ), 'image with no alt text falls back to the product name' );
$ok( str_contains( $html, '5+ vials: save 15%' ), 'volume pricing shown on product page' );
preg_match( '#<script type="application/ld\+json" class="rank-math-schema">(.*?)</script>#s', $html, $m );
$product = null;
foreach ( json_decode( $m[1] ?? '{}', true )['@graph'] ?? [] as $e ) { if ( 'Product' === ( $e['@type'] ?? '' ) ) { $product = $e; } }
$ok( (bool) $product, 'Rank Math outputs Product schema' );
$ok( 'Heartland Bio Labs' === ( $product['brand']['name'] ?? '' ), 'brand added to Rank Math Product schema' );
$ok( str_contains( $product['description'] ?? '', 'Available in 5mg and 10mg.' ), 'schema "Available in" rewritten from strengths on sale' );

/* Cart: volume pricing */
wc_load_cart();
$cart = WC()->cart;
$add  = function ( $pid, $size, $qty ) use ( $cart ) {
	foreach ( wc_get_product( $pid )->get_children() as $vid ) {
		if ( wc_get_product( $vid )->get_attribute( 'pa_strength' ) === $size ) { $cart->add_to_cart( $pid, $qty, $vid ); }
	}
};
$fee = function () use ( $cart ) { $cart->calculate_totals(); $f = array_values( $cart->get_fees() ); return $f ? round( (float) $f[0]->amount, 2 ) : 0.0; };
$cart->empty_cart();
$add( $ids['bpc'], '5mg', 2 ); $add( $ids['bac'], '10ml', 3 );
$ok( 0.0 === $fee(), '2 vials + 3 bacteriostatic water: no discount (supplies excluded)' );
$add( $ids['bpc'], '10mg', 1 );
$ok( -16.1 === $fee(), '3 vials ($161): 10% off = -$16.10' );
$add( $ids['tb'], '10mg', 2 );
$ok( -49.65 === $fee(), '5 vials ($331): 15% off = -$49.65' );
if ( ! wc_get_coupon_id_by_code( 'welcome10' ) ) { $c = new WC_Coupon(); $c->set_code( 'welcome10' ); $c->set_discount_type( 'percent' ); $c->set_amount( 10 ); $c->save(); }
$cart->apply_coupon( 'welcome10' );
$ok( 0.0 === $fee() && $cart->get_discount_total() > 0, 'a coupon replaces the volume discount' );
$ok( str_contains( ps_volume_nudge(), 'combine with coupons' ), 'cart explains coupons and volume pricing don\'t combine' );
$cart->empty_cart();

/* Import files: each changes only its own columns */
include_once WC_ABSPATH . 'includes/admin/importers/class-wc-product-csv-importer-controller.php';
include_once WC_ABSPATH . 'includes/import/class-wc-product-csv-importer.php';
$ctl  = new WC_Product_CSV_Importer_Controller();
$auto = new ReflectionMethod( $ctl, 'auto_map_columns' );
$auto->setAccessible( true );
$import = function ( $file, $dry ) use ( $ctl, $auto ) {
	$fh = fopen( $file, 'r' ); $headers = fgetcsv( $fh ); fclose( $fh );
	$imp = new WC_Product_CSV_Importer( $file, [ 'update_existing' => true, 'parse' => true, 'mapping' => [ 'from' => $headers, 'to' => $auto->invoke( $ctl, $headers ) ] ] );
	return $dry ? $imp->get_parsed_data() : $imp->import();
};
foreach ( glob( dirname( __DIR__, 2 ) . '/catalog/import/*.csv' ) as $file ) {
	$rows = $import( $file, true );
	$ok( $rows && ! array_filter( $rows, fn( $r ) => empty( $r['id'] ) ), basename( $file ) . ': ' . count( $rows ) . ' rows parse with WP Admin\'s column mapping, all matched by ID' );
}
$T = $ids['bac']; $v = wc_get_product( $T )->get_children()[0];   // a product the browser checks don't read
$tmp = get_temp_dir();
$csv = function ( $name, $rows ) use ( $tmp ) { $f = fopen( "$tmp/$name", 'w' ); foreach ( $rows as $r ) { fputcsv( $f, $r ); } fclose( $f ); return "$tmp/$name"; };
$snap = function () use ( $T, $v ) {
	wc_delete_product_transients( $T ); clean_post_cache( $T ); clean_post_cache( $v );
	$p = wc_get_product( $T ); $x = wc_get_product( $v );
	return [ 'name' => $p->get_name(), 'short' => $p->get_short_description(), 'desc' => $p->get_description(), 'cats' => $p->get_category_ids(),
		'rm_title' => get_post_meta( $T, 'rank_math_title', true ), 'v_sku' => $x->get_sku(), 'v_price' => $x->get_regular_price(),
		'v_stock' => $x->get_stock_status(), 'v_attr' => $x->get_attributes(), 'kids' => count( $p->get_children() ),
		'products' => count( wc_get_products( [ 'limit' => -1, 'return' => 'ids' ] ) ) ];
};
$before = $snap();
$run    = wp_generate_password( 6, false );   // fresh values each run, so reruns still change something
$files  = [
	'v_sku'    => $csv( 'a.csv', [ [ 'ID', 'Type', 'Parent', 'SKU' ], [ $v, 'variation', "id:$T", "HBL-TEST-$run" ] ] ),
	'v_price'  => $csv( 'b.csv', [ [ 'ID', 'Type', 'Parent', 'Regular price' ], [ $v, 'variation', "id:$T", (string) ( 40 + wp_rand( 0, 99 ) / 100 ) ] ] ),
	'desc'     => $csv( 'c.csv', [ [ 'ID', 'Type', 'Description' ], [ $T, 'variable', "<p>New description $run, with commas</p>" ] ] ),
	'rm_title' => $csv( 'd.csv', [ [ 'ID', 'Type', 'Meta: rank_math_title' ], [ $T, 'variable', "Bacteriostatic Water 10ml | Test $run" ] ] ),
];
foreach ( $files as $file ) { $import( $file, false ); }
$after = $snap();
$changed = array_keys( array_filter( $before, fn( $val, $k ) => $val !== $after[ $k ], ARRAY_FILTER_USE_BOTH ) );
sort( $changed ); $want = array_keys( $files ); sort( $want );
$ok( $changed === $want, 'imports changed only ' . implode( ', ', $want ) . ' (changed: ' . implode( ', ', $changed ) . ')' );

/* Reorder reminder and unsubscribe (a fresh address each run, so reruns start clean) */
$email = 'reminder-' . wp_generate_password( 8, false ) . '@example.com';
$order = wc_create_order();
$order->add_product( wc_get_product( wc_get_product( $ids['bpc'] )->get_children()[0] ), 1 );
$order->set_billing_email( $email ); $order->set_billing_first_name( 'Ann' ); $order->calculate_totals();
$order->update_status( 'completed' );
$next = as_next_scheduled_action( 'ps_reorder_reminder', [ $order->get_id() ], 'peptide-store' );
$ok( $next && abs( ( $next - time() ) / DAY_IN_SECONDS - PS_REORDER_DAYS ) < 0.1, 'reminder scheduled ' . PS_REORDER_DAYS . ' days after completion' );
$mail = null;
add_filter( 'pre_wp_mail', function ( $r, $a ) use ( &$mail ) { $mail = $a; return true; }, 10, 2 );
do_action( 'ps_reorder_reminder', $order->get_id() );
$ok( $mail && $email === $mail['to'] && str_contains( $mail['message'], '/product/bpc-157/' ), 'reminder email sent with a link to the product' );
preg_match( '#href="([^"]*ps_reorder_optout[^"]*)"#', $mail['message'] ?? '', $mm );
$link = html_entity_decode( $mm[1] ?? '' );
$r = wp_remote_get( $link, [ 'timeout' => 30 ] );
$ok( 200 === wp_remote_retrieve_response_code( $r ) && str_contains( wp_remote_retrieve_body( $r ), 'Stop reorder reminders' ) && ! in_array( strtolower( $email ), (array) get_option( 'ps_reorder_optout', [] ), true ), 'opening the link only asks for confirmation' );
$code = wp_remote_retrieve_response_code( wp_remote_get( preg_replace( '/t=[0-9a-f]+/', 't=bad', $link ), [ 'timeout' => 30 ] ) );
$ok( 400 === $code, "a forged token is refused (HTTP $code)" );
parse_str( wp_parse_url( $link, PHP_URL_QUERY ), $q );
wp_remote_post( strtok( $link, '?' ), [ 'body' => $q, 'timeout' => 30 ] );
wp_cache_flush();   // the server process saved it; drop this process's cached copy (including notoptions)
$ok( in_array( strtolower( $email ), (array) get_option( 'ps_reorder_optout', [] ), true ), 'confirming unsubscribes' );
$mail = null; do_action( 'ps_reorder_reminder', $order->get_id() );
$ok( null === $mail, 'no reminder after unsubscribing' );

echo $fail ? "\n$fail check(s) failed.\n" : "\nAll server-side checks pass.\n";
exit( $fail ? 1 : 0 );

<?php
// Products shaped like the live store: variable products on a global
// Strength attribute, one fully out of stock, one partly, and a Supplies item.
function ps_t_term( $tax, $name ) { $t = term_exists( $name, $tax ); return $t ? (int) $t['term_id'] : (int) wp_insert_term( $name, $tax )['term_id']; }
if ( ! wc_attribute_taxonomy_id_by_name( 'strength' ) ) {
	wc_create_attribute( [ 'name' => 'Strength', 'slug' => 'strength' ] );
	register_taxonomy( 'pa_strength', 'product' );
}
foreach ( [ '5mg', '10mg', '600mg', '1200mg', '10ml' ] as $s ) { ps_t_term( 'pa_strength', $s ); }
$countdown = '<p class="hbl-delivery-countdown">Same-day shipping if you order today</p>';
function ps_t_variable( $name, $cat, $sizes, $short, $desc ) {
	$p = new WC_Product_Variable();
	$p->set_name( $name ); $p->set_category_ids( [ ps_t_term( 'product_cat', $cat ) ] ); $p->set_short_description( $short ); $p->set_description( $desc );
	$a = new WC_Product_Attribute(); $a->set_id( wc_attribute_taxonomy_id_by_name( 'strength' ) ); $a->set_name( 'pa_strength' );
	$a->set_options( array_map( fn( $s ) => get_term_by( 'name', $s[0], 'pa_strength' )->term_id, $sizes ) ); $a->set_visible( true ); $a->set_variation( true );
	$p->set_attributes( [ $a ] ); $p->set_default_attributes( [ 'pa_strength' => sanitize_title( $sizes[0][0] ) ] );
	$id = $p->save();
	foreach ( $sizes as [ $s, $price, $stock, $sku ] ) {
		$v = new WC_Product_Variation(); $v->set_parent_id( $id ); $v->set_attributes( [ 'pa_strength' => sanitize_title( $s ) ] );
		$v->set_regular_price( $price ); $v->set_stock_status( $stock ); $v->set_sku( $sku ); $v->save();
	}
	WC_Product_Variable::sync( $id );
	return $id;
}
$ids = [
	'bpc' => ps_t_variable( 'BPC-157', 'Recovery', [ [ '5mg', '41', 'instock', 'HBL-BPC157-5MG' ], [ '10mg', '79', 'instock', 'HBL-BPC157-10MG' ] ],
		'Buy BPC-157 for research use. COA-verified purity. Available in 2mg, 5mg, and 10mg. Research use only.',
		'<p>Every product is tested by HPLC for purity (target COA-verified purity) and mass spectrometry for identity.</p>' . $countdown ),
	'glu' => ps_t_variable( 'Glutathione', 'Dermal', [ [ '600mg', '55', 'outofstock', 'HBL-GLUTATHIONE-600MG' ], [ '1200mg', '99', 'outofstock', 'HBL-GLUTATHIONE-1200MG' ] ], 'Glutathione.', $countdown ),
	'tb'  => ps_t_variable( 'TB-500', 'Recovery', [ [ '5mg', '45', 'outofstock', 'HBL-TB500-5MG' ], [ '10mg', '85', 'instock', 'HBL-TB500-10MG' ] ], 'TB-500.', $countdown ),
	'bac' => ps_t_variable( 'Bacteriostatic Water', 'Supplies', [ [ '10ml', '9', 'instock', 'HBL-BACWATER-10ML' ] ], 'Bac water.', '<p>Water</p>' ),
];
// A product image with no alt text.
$att = wp_insert_attachment( [ 'post_title' => 'img', 'post_mime_type' => 'image/png', 'post_status' => 'inherit' ], ABSPATH . 'wp-admin/images/w-logo-blue.png', $ids['bpc'] );
wp_update_attachment_metadata( $att, [ 'width' => 80, 'height' => 80, 'file' => 'w-logo-blue.png' ] );
set_post_thumbnail( $ids['bpc'], $att );
// Rank Math product schema, as on the live store.
$o = get_option( 'rank-math-options-titles', [] ); $o['pt_product_default_rich_snippet'] = 'product'; $o['pt_product_default_snippet_desc'] = '%excerpt%'; update_option( 'rank-math-options-titles', $o );
// Checkout: cash on delivery, flat-rate shipping, a classic shortcode checkout beside the block one.
WC()->payment_gateways()->payment_gateways()['cod']->update_option( 'enabled', 'yes' );
$zone = new WC_Shipping_Zone( 0 ); $zone->add_shipping_method( 'flat_rate' );
foreach ( ( new WC_Shipping_Zone( 0 ) )->get_shipping_methods() as $m ) { $m->update_option( 'cost', '5' ); }
update_option( 'woocommerce_default_country', 'US:OK' );
$ids['classic_checkout'] = wp_insert_post( [ 'post_type' => 'page', 'post_status' => 'publish', 'post_title' => 'Classic Checkout', 'post_name' => 'classic-checkout', 'post_content' => '[woocommerce_checkout]' ] );
update_option( 'ps_test_ids', $ids );
echo 'Seeded: ', wp_json_encode( $ids ), "\n";

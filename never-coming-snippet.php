<?php
/* "NEVER COMING" badge for WooCommerce.
   Any product tagged `never-coming` is greyed out, gets a NEVER COMING
   badge on top, and cannot be added to the cart, even through a direct
   add-to-cart link. Install with the Code Snippets plugin (Run everywhere)
   or paste into the child theme's functions.php.                        */

function mbl_is_never_coming( $product_id ) {
	return has_term( 'never-coming', 'product_tag', $product_id );
}

// Block purchase, including direct ?add-to-cart= URLs.
add_filter( 'woocommerce_is_purchasable', function ( $purchasable, $product ) {
	$id = $product->get_parent_id() ?: $product->get_id();
	return mbl_is_never_coming( $id ) ? false : $purchasable;
}, 10, 2 );

// Replace the "Out of stock" text with the label.
add_filter( 'woocommerce_get_stock_html', function ( $html, $product ) {
	return mbl_is_never_coming( $product->get_id() )
		? '<p class="stock mbl-never-coming-text">Never Coming</p>'
		: $html;
}, 10, 2 );

// Class used by the CSS below, on shop cards and the product page.
add_filter( 'woocommerce_post_class', function ( $classes, $product ) {
	if ( mbl_is_never_coming( $product->get_id() ) ) {
		$classes[] = 'mbl-never-coming';
	}
	return $classes;
}, 10, 2 );

// Badge on top of the product image (shop grid and single product).
$mbl_badge = function () {
	global $product;
	if ( $product && mbl_is_never_coming( $product->get_id() ) ) {
		echo '<span class="mbl-never-coming-badge">NEVER COMING</span>';
	}
};
add_action( 'woocommerce_before_shop_loop_item_title', $mbl_badge, 9 );
add_action( 'woocommerce_before_single_product_summary', $mbl_badge, 5 );

add_action( 'wp_head', function () {
	echo '<style>
	.mbl-never-coming { position: relative; }
	.mbl-never-coming img { filter: grayscale(1); opacity: .45; }
	.mbl-never-coming .price,
	.mbl-never-coming .woocommerce-loop-product__title { opacity: .5; }
	.mbl-never-coming .button, .mbl-never-coming form.cart { display: none !important; }
	.mbl-never-coming-badge {
		position: absolute; top: 10px; left: 10px; z-index: 5;
		background: #3a3a3a; color: #fff; font-weight: 700; font-size: 12px;
		letter-spacing: .08em; padding: 6px 10px; border-radius: 4px;
	}
	.mbl-never-coming-text { color: #777; font-weight: 700; text-transform: uppercase; }
	</style>';
} );

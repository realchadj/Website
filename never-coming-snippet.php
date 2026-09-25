<?php
/* Retatrutide: not for sale.
   Every product whose name contains "Retatrutide" is greyed out, shows a
   red NEVER COMING sticker, and cannot be added to the cart, even through
   a direct add-to-cart link. No other product is touched.
   Install with the Code Snippets plugin (Run everywhere) or paste into the
   child theme's functions.php.                                            */

function mbl_is_retatrutide( $product ) {
	if ( ! $product instanceof WC_Product ) {
		$product = wc_get_product( $product );
	}
	if ( ! $product ) {
		return false;
	}
	if ( $product->get_parent_id() ) {
		$product = wc_get_product( $product->get_parent_id() ) ?: $product;
	}
	return stripos( $product->get_name(), 'retatrutide' ) !== false;
}

// Block purchase, including direct ?add-to-cart= URLs.
add_filter( 'woocommerce_is_purchasable', function ( $purchasable, $product ) {
	return mbl_is_retatrutide( $product ) ? false : $purchasable;
}, 10, 2 );

add_filter( 'woocommerce_add_to_cart_validation', function ( $passed, $product_id ) {
	if ( mbl_is_retatrutide( $product_id ) ) {
		wc_add_notice( 'Retatrutide is not available.', 'error' );
		return false;
	}
	return $passed;
}, 10, 2 );

// Replace the stock line under the price with "Never Coming".
add_filter( 'woocommerce_get_stock_html', function ( $html, $product ) {
	return mbl_is_retatrutide( $product )
		? '<p class="stock mbl-never-coming-text">Never Coming</p>'
		: $html;
}, 10, 2 );

// Class used by the CSS below, on shop cards and the product page.
add_filter( 'woocommerce_post_class', function ( $classes, $product ) {
	if ( mbl_is_retatrutide( $product ) ) {
		$classes[] = 'mbl-never-coming';
	}
	return $classes;
}, 10, 2 );

// Red sticker over the product image (shop grid and single product).
$mbl_sticker = function () {
	global $product;
	if ( $product && mbl_is_retatrutide( $product ) ) {
		echo '<span class="mbl-never-coming-badge">NEVER COMING</span>';
	}
};
add_action( 'woocommerce_before_shop_loop_item_title', $mbl_sticker, 9 );
add_action( 'woocommerce_before_single_product_summary', $mbl_sticker, 5 );

add_action( 'wp_head', function () {
	echo '<style>
	.mbl-never-coming { position: relative; }
	.mbl-never-coming img { filter: grayscale(1); opacity: .45; }
	.mbl-never-coming .price,
	.mbl-never-coming .woocommerce-loop-product__title { opacity: .5; }
	.mbl-never-coming .button, .mbl-never-coming form.cart { display: none !important; }
	.mbl-never-coming-badge {
		position: absolute; top: 14px; left: 10px; z-index: 5;
		background: #d10000; color: #fff; font-weight: 800; font-size: 13px;
		letter-spacing: .08em; padding: 7px 12px; border-radius: 4px;
		transform: rotate(-8deg); box-shadow: 0 2px 6px rgba(0,0,0,.35);
	}
	.mbl-never-coming-text { color: #d10000; font-weight: 800; text-transform: uppercase; }
	</style>';
} );

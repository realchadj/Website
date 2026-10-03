<?php
/**
 * Plugin Name: Peptide Store Essentials
 * Description: Research-use acknowledgment at checkout, mix-and-match volume pricing, a COA button on product pages, and reorder reminder emails.
 * Version:     1.0.0
 * Requires Plugins: woocommerce
 *
 * Install: copy this file to wp-content/mu-plugins/ (always on) or zip it
 * and upload under Plugins → Add New. Works with both the block checkout
 * and the classic [woocommerce_checkout] shortcode.
 */

defined( 'ABSPATH' ) || exit;

/* Keep these in step with volumeTiers in pricing/reprice.mjs, which checks
   that the deepest tier still leaves the target margin on every product. */
const PS_VOLUME_TIERS     = [ 5 => 0.15, 3 => 0.10 ];   // min vials => discount, deepest first
const PS_SUPPLIES_CAT     = 'lab-supplies';             // excluded from the vial count and the discount
const PS_REORDER_DAYS     = 35;
const PS_ACK_FIELD        = 'peptide-store/ruo-ack';
const PS_ACK_LABEL        = 'I am 21 or older and a qualified researcher. I am buying these products for laboratory research only, not for human or veterinary use.';

/* ------------------------------------------- research-use acknowledgment -- */

// Block checkout (WooCommerce 8.9+): a required checkbox saved to the order.
add_action( 'woocommerce_init', function () {
	if ( function_exists( 'woocommerce_register_additional_checkout_field' ) ) {
		woocommerce_register_additional_checkout_field( [
			'id'       => PS_ACK_FIELD,
			'label'    => PS_ACK_LABEL,
			'location' => 'order',
			'type'     => 'checkbox',
			'required' => true,
		] );
	}
} );

// Enforce it server-side too, for WooCommerce versions that don't honour
// `required` on checkboxes.
add_action( 'woocommerce_blocks_validate_location_order_fields', function ( WP_Error $errors, $fields ) {
	if ( empty( $fields[ PS_ACK_FIELD ] ) ) {
		$errors->add( 'ps_ruo_ack', 'Please confirm the research-use-only acknowledgment to place your order.' );
	}
}, 10, 2 );

// Classic checkout.
add_action( 'woocommerce_review_order_before_submit', function () {
	woocommerce_form_field( 'ps_ruo_ack', [
		'type'     => 'checkbox',
		'class'    => [ 'form-row-wide' ],
		'label'    => esc_html( PS_ACK_LABEL ),
		'required' => true,
	] );
} );

add_action( 'woocommerce_checkout_process', function () {
	if ( empty( $_POST['ps_ruo_ack'] ) ) { // phpcs:ignore WordPress.Security.NonceVerification -- WooCommerce verifies the checkout nonce.
		wc_add_notice( 'Please confirm the research-use-only acknowledgment to place your order.', 'error' );
	}
} );

add_action( 'woocommerce_checkout_create_order', function ( WC_Order $order ) {
	if ( ! empty( $_POST['ps_ruo_ack'] ) ) { // phpcs:ignore WordPress.Security.NonceVerification
		$order->update_meta_data( '_ps_ruo_ack', gmdate( 'c' ) );
	}
} );

/* ------------------------------------------------------- volume pricing -- */

function ps_counts_toward_volume( $product_id ) {
	return ! has_term( PS_SUPPLIES_CAT, 'product_cat', $product_id );
}

function ps_tier_for( $qty ) {
	foreach ( PS_VOLUME_TIERS as $min => $off ) {
		if ( $qty >= $min ) {
			return $off;
		}
	}
	return 0;
}

function ps_cart_vials() {
	$qty = 0;
	$subtotal = 0;
	if ( WC()->cart ) {
		foreach ( WC()->cart->get_cart() as $item ) {
			if ( ps_counts_toward_volume( $item['product_id'] ) ) {
				$qty      += $item['quantity'];
				$subtotal += $item['line_subtotal'];
			}
		}
	}
	return [ $qty, $subtotal ];
}

add_action( 'woocommerce_cart_calculate_fees', function ( WC_Cart $cart ) {
	// Volume pricing and coupons don't stack; a coupon replaces the volume discount.
	if ( $cart->get_applied_coupons() ) {
		return;
	}
	[ $qty, $subtotal ] = ps_cart_vials();
	$off = ps_tier_for( $qty );
	if ( $off > 0 && $subtotal > 0 ) {
		$cart->add_fee( sprintf( 'Volume discount (%d%% off %d vials)', round( $off * 100 ), $qty ), -round( $subtotal * $off, 2 ), true );
	}
} );

function ps_volume_nudge() {
	[ $qty ] = ps_cart_vials();
	if ( $qty < 1 ) {
		return '';
	}
	if ( WC()->cart->get_applied_coupons() ) {
		return $qty >= min( array_keys( PS_VOLUME_TIERS ) )
			? '<div class="woocommerce-info ps-volume-nudge">' . esc_html( 'Volume pricing doesn\'t combine with coupons. Remove the coupon to use the volume discount instead.' ) . '</div>'
			: '';
	}
	$current = ps_tier_for( $qty );
	foreach ( array_reverse( PS_VOLUME_TIERS, true ) as $min => $off ) {
		if ( $qty < $min ) {
			$msg = sprintf( 'Add %d more research vial%s to save %d%% on every research vial.', $min - $qty, 1 === $min - $qty ? '' : 's', round( $off * 100 ) );
			if ( $current > 0 ) {
				$msg = sprintf( 'You\'re saving %d%%. ', round( $current * 100 ) ) . $msg;
			}
			return '<div class="woocommerce-info ps-volume-nudge">' . esc_html( $msg ) . '</div>';
		}
	}
	return '<div class="woocommerce-message ps-volume-nudge">' . esc_html( sprintf( 'Best price unlocked: %d%% off every research vial in this order.', round( $current * 100 ) ) ) . '</div>';
}

add_action( 'woocommerce_before_cart', function () {
	echo ps_volume_nudge(); // phpcs:ignore WordPress.Security.EscapeOutput -- escaped in ps_volume_nudge().
} );

add_filter( 'render_block_woocommerce/cart', function ( $html ) {
	return ps_volume_nudge() . $html;
} );

/* ------------------------------------------------- product page additions -- */

add_action( 'woocommerce_single_product_summary', function () {
	global $product;
	if ( ! $product instanceof WC_Product ) {
		return;
	}
	if ( ps_counts_toward_volume( $product->get_id() ) ) {
		$parts = [];
		foreach ( array_reverse( PS_VOLUME_TIERS, true ) as $min => $off ) {
			$parts[] = sprintf( '<strong>%d+ vials: save %d%%</strong>', $min, round( $off * 100 ) );
		}
		echo '<p class="ps-volume-pricing">' . implode( ' &middot; ', $parts ) . ' &mdash; mix and match any research vials.</p>'; // phpcs:ignore WordPress.Security.EscapeOutput -- built from integers.
	}
	$coa = $product->get_meta( '_coa_url' );
	if ( $coa ) {
		printf( '<p class="ps-coa"><a class="button" href="%s" target="_blank" rel="noopener">View certificate of analysis</a></p>', esc_url( $coa ) );
	}
}, 25 );

/* ---------------------------------------------------- reorder reminders -- */

add_action( 'woocommerce_order_status_completed', function ( $order_id ) {
	if ( function_exists( 'as_schedule_single_action' ) ) {
		as_schedule_single_action( time() + PS_REORDER_DAYS * DAY_IN_SECONDS, 'ps_reorder_reminder', [ (int) $order_id ], 'peptide-store' );
	}
} );

function ps_optout_token( $email ) {
	return hash_hmac( 'sha256', strtolower( $email ), wp_salt( 'auth' ) );
}

add_action( 'ps_reorder_reminder', function ( $order_id ) {
	$order = wc_get_order( $order_id );
	if ( ! $order ) {
		return;
	}
	$email = $order->get_billing_email();
	if ( ! $email || in_array( strtolower( $email ), (array) get_option( 'ps_reorder_optout', [] ), true ) ) {
		return;
	}
	// They've already reordered, so there's nothing to remind them of.
	$newer = wc_get_orders( [
		'billing_email' => $email,
		'status'        => [ 'processing', 'completed', 'on-hold' ],
		'date_created'  => '>' . $order->get_date_created()->getTimestamp(),
		'limit'         => 1,
		'return'        => 'ids',
	] );
	if ( $newer ) {
		return;
	}

	$items = '';
	foreach ( $order->get_items() as $item ) {
		$product = $item->get_product();
		if ( $product && 'publish' === $product->get_status() && $product->is_in_stock() ) {
			$items .= sprintf( '<li><a href="%s">%s</a></li>', esc_url( $product->get_permalink() ), esc_html( $product->get_name() ) );
		}
	}
	if ( ! $items ) {
		return;
	}

	$optout = add_query_arg( [
		'action' => 'ps_reorder_optout',
		'e'      => rawurlencode( $email ),
		't'      => ps_optout_token( $email ),
	], admin_url( 'admin-post.php' ) );

	$body = sprintf(
		'<p>Hi %s,</p><p>It has been about %d days since your last order. If your research is running low, here is what you ordered last time:</p><ul>%s</ul>' .
		'<p>Volume pricing applies automatically: save 10%% on 3+ research vials and 15%% on 5+ (not combinable with coupons).</p>' .
		'<p style="font-size:12px;color:#777">All products are for laboratory research use only. <a href="%s">Stop reorder reminders</a>.</p>',
		esc_html( $order->get_billing_first_name() ?: 'there' ),
		PS_REORDER_DAYS,
		$items,
		esc_url( $optout )
	);

	$mailer = WC()->mailer();
	$mailer->send( $email, 'Time to restock your research supplies?', $mailer->wrap_message( 'Running low?', $body ) );
} );

// The emailed link only shows a confirm button, so mail scanners that open
// every link can't unsubscribe anyone; the POST does the unsubscribing.
$ps_optout = function () {
	$src   = 'POST' === $_SERVER['REQUEST_METHOD'] ? $_POST : $_GET; // phpcs:ignore WordPress.Security.NonceVerification -- signed by token.
	$email = isset( $src['e'] ) ? sanitize_email( wp_unslash( $src['e'] ) ) : '';
	$token = isset( $src['t'] ) ? sanitize_text_field( wp_unslash( $src['t'] ) ) : '';
	if ( ! $email || ! hash_equals( ps_optout_token( $email ), $token ) ) {
		wp_die( 'This unsubscribe link is invalid.', 'Unsubscribe', [ 'response' => 400 ] );
	}
	if ( 'POST' !== $_SERVER['REQUEST_METHOD'] ) {
		wp_die(
			sprintf(
				'<p>Stop reorder reminders to %s?</p><form method="post" action="%s"><input type="hidden" name="action" value="ps_reorder_optout"><input type="hidden" name="e" value="%s"><input type="hidden" name="t" value="%s"><button type="submit">Unsubscribe</button></form>',
				esc_html( $email ),
				esc_url( admin_url( 'admin-post.php' ) ),
				esc_attr( $email ),
				esc_attr( $token )
			),
			'Unsubscribe',
			[ 'response' => 200 ]
		);
	}
	$list = (array) get_option( 'ps_reorder_optout', [] );
	if ( ! in_array( strtolower( $email ), $list, true ) ) {
		$list[] = strtolower( $email );
		update_option( 'ps_reorder_optout', $list, false );
	}
	wp_die( 'You will no longer receive reorder reminders.', 'Unsubscribed', [ 'response' => 200 ] );
};
add_action( 'admin_post_nopriv_ps_reorder_optout', $ps_optout );
add_action( 'admin_post_ps_reorder_optout', $ps_optout );

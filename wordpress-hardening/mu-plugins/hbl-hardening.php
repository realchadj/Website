<?php
/**
 * Plugin Name: HBL Security Hardening
 * Description: Closes user enumeration, hides version info, blocks XML-RPC login brute force, makes login errors generic, and auto-deactivates WP File Manager after a work session.
 * Version:     1.0.0
 *
 * Must-use plugin: upload to wp-content/mu-plugins/ (create the folder if it
 * doesn't exist). It loads automatically, cannot be deactivated from the
 * dashboard, and is not touched by theme or plugin updates.
 *
 * Opt-outs, set in wp-config.php above "That's all, stop editing!":
 *   define( 'HBL_ALLOW_XMLRPC', true );        // Jetpack or the WordPress mobile app needs XML-RPC logins
 *   define( 'HBL_FILE_MANAGER_TTL', 0 );       // never auto-deactivate WP File Manager
 *   define( 'HBL_FILE_MANAGER_TTL', 7200 );    // or: auto-deactivate after N seconds (default 3 hours)
 */

defined( 'ABSPATH' ) || exit;

/*
 * 1. User enumeration.
 *
 * The users endpoint, author archives, ?author=N, the core users sitemap and
 * oEmbed author data each give away login slugs. Logged-in users keep the
 * endpoint: the block editor needs it for the author picker.
 */
add_filter(
	'rest_pre_dispatch',
	function ( $result, $server, $request ) {
		if ( is_user_logged_in() ) {
			return $result;
		}
		if ( preg_match( '#^/wp/v2/users(/|$)#i', $request->get_route() ) ) {
			return new WP_Error( 'rest_forbidden', 'Sorry, you are not allowed to do that.', array( 'status' => 401 ) );
		}
		return $result;
	},
	10,
	3
);

// Keep the users route out of the public REST index at /wp-json/.
add_filter(
	'rest_endpoints',
	function ( $endpoints ) {
		if ( is_user_logged_in() ) {
			return $endpoints;
		}
		foreach ( array_keys( $endpoints ) as $route ) {
			if ( preg_match( '#^/wp/v2/users(/|$)#i', $route ) ) {
				unset( $endpoints[ $route ] );
			}
		}
		return $endpoints;
	}
);

// ?author=1 redirects to /author/<login>/, and the archive itself shows the slug.
// Runs before redirect_canonical (priority 10), so the slug is never revealed.
add_action(
	'template_redirect',
	function () {
		if ( is_admin() ) {
			return;
		}
		if ( isset( $_GET['author'] ) || is_author() ) { // phpcs:ignore WordPress.Security.NonceVerification
			wp_safe_redirect( home_url( '/' ), 301 );
			exit;
		}
	},
	1
);

add_filter(
	'wp_sitemaps_add_provider',
	function ( $provider, $name ) {
		return 'users' === $name ? false : $provider;
	},
	10,
	2
);

add_filter(
	'oembed_response_data',
	function ( $data ) {
		unset( $data['author_name'], $data['author_url'] );
		return $data;
	}
);

// Author links in themes, feeds and schema point to the homepage instead of /author/<login>/.
add_filter(
	'author_link',
	function () {
		return home_url( '/' );
	}
);

/*
 * 2. Login brute force.
 */

// One message for every bad-credentials case, so the login form can't be used
// to confirm which usernames or emails exist. Covers wp-login.php and the
// WooCommerce My Account form, which both go through wp_authenticate().
add_filter(
	'authenticate',
	function ( $user ) {
		if ( is_wp_error( $user ) && array_intersect( $user->get_error_codes(), array( 'invalid_username', 'invalid_email', 'incorrect_password' ) ) ) {
			return new WP_Error( 'hbl_invalid_login', '<strong>Error:</strong> The username, email address or password is incorrect.' );
		}
		return $user;
	},
	99
);

// XML-RPC lets an attacker test hundreds of passwords in one request
// (system.multicall). This turns off only the methods that log in; pingbacks
// still work.
if ( ! ( defined( 'HBL_ALLOW_XMLRPC' ) && HBL_ALLOW_XMLRPC ) ) {
	add_filter( 'xmlrpc_enabled', '__return_false' );
	add_filter(
		'wp_headers',
		function ( $headers ) {
			unset( $headers['X-Pingback'] );
			return $headers;
		}
	);
}

/*
 * 3. Version leaks.
 */
remove_action( 'wp_head', 'wp_generator' );
add_filter( 'the_generator', '__return_empty_string' );

// Core assets are served as ?ver=<WordPress version>. Swap that for an opaque
// value that still changes on every core update, so browser caches still bust.
$hbl_hide_core_ver = function ( $src ) {
	global $wp_version;
	if ( $src && false !== strpos( $src, 'ver=' . $wp_version ) ) {
		$src = add_query_arg( 'ver', substr( wp_hash( $wp_version ), 0, 8 ), $src );
	}
	return $src;
};
add_filter( 'script_loader_src', $hbl_hide_core_ver, 999 );
add_filter( 'style_loader_src', $hbl_hide_core_ver, 999 );

add_action(
	'send_headers',
	function () {
		header_remove( 'X-Powered-By' ); // PHP version
	}
);

/*
 * 4. WP File Manager: auto-deactivate after a work session.
 *
 * Activate it from Plugins when you need it; it switches itself off once the
 * time limit passes, whether or not anyone is in the dashboard at the time.
 */
define( 'HBL_FILE_MANAGER_PLUGIN', 'wp-file-manager/file_folder_manager.php' );

add_action(
	'activated_plugin',
	function ( $plugin ) {
		if ( HBL_FILE_MANAGER_PLUGIN === $plugin ) {
			update_option( 'hbl_file_manager_activated_at', time(), false );
		}
	}
);

add_action(
	'init',
	function () {
		$ttl = defined( 'HBL_FILE_MANAGER_TTL' ) ? (int) HBL_FILE_MANAGER_TTL : 3 * HOUR_IN_SECONDS;
		if ( $ttl <= 0 || ! in_array( HBL_FILE_MANAGER_PLUGIN, (array) get_option( 'active_plugins', array() ), true ) ) {
			return;
		}
		$since = (int) get_option( 'hbl_file_manager_activated_at' );
		if ( ! $since ) {
			// Already active when this plugin was installed: start the clock now.
			update_option( 'hbl_file_manager_activated_at', time(), false );
			return;
		}
		if ( time() - $since < $ttl ) {
			return;
		}
		require_once ABSPATH . 'wp-admin/includes/plugin.php';
		deactivate_plugins( HBL_FILE_MANAGER_PLUGIN, true );
		delete_option( 'hbl_file_manager_activated_at' );
	}
);

add_action(
	'admin_notices',
	function () {
		$ttl   = defined( 'HBL_FILE_MANAGER_TTL' ) ? (int) HBL_FILE_MANAGER_TTL : 3 * HOUR_IN_SECONDS;
		$since = (int) get_option( 'hbl_file_manager_activated_at' );
		if ( $ttl <= 0 || ! $since || ! current_user_can( 'activate_plugins' ) ) {
			return;
		}
		$left = max( 1, (int) ceil( ( $since + $ttl - time() ) / MINUTE_IN_SECONDS ) );
		printf(
			'<div class="notice notice-warning"><p>WP File Manager is active and will switch itself off in about %d minutes. Deactivate it yourself when you finish.</p></div>',
			$left
		);
	}
);

<?php
/**
 * Plugin Name: HBL Hardening Installer
 * Description: One-click installer for the security hardening kit. Activate it once: it installs the must-use plugin and the .htaccess rules, tests the site, rolls back anything that breaks it, shows a report, and switches itself off. Then delete it.
 * Version:     1.0.0
 */

defined( 'ABSPATH' ) || exit;

const HBL_MARK = 'HBL Hardening';

register_activation_hook( __FILE__, 'hbl_installer_run' );

function hbl_installer_run() {
	require_once ABSPATH . 'wp-admin/includes/file.php';
	$payload = __DIR__ . '/payload';
	$report  = array();

	// 1. Must-use plugin.
	$mu_dir = defined( 'WPMU_PLUGIN_DIR' ) ? WPMU_PLUGIN_DIR : WP_CONTENT_DIR . '/mu-plugins';
	if ( ! is_dir( $mu_dir ) ) {
		wp_mkdir_p( $mu_dir );
	}
	if ( @copy( $payload . '/hbl-hardening.php', $mu_dir . '/hbl-hardening.php' ) ) {
		$report[] = array( 'ok', 'Must-use plugin installed (username hiding, login protection, version hiding, File Manager auto-off).' );
	} else {
		$report[] = array( 'fail', 'Could not write to ' . $mu_dir . '. Upload hbl-hardening.php there by hand.' );
	}

	// 2. Root .htaccess, tested. If the host refuses a directive (500), retry without
	// the two that need full override rights, then give up and restore the original.
	$root_file = get_home_path() . '.htaccess';
	$block     = file_get_contents( $payload . '/root-htaccess-block.txt' );
	$variants  = array(
		'full'    => $block,
		'reduced' => preg_replace( '/^(Options -Indexes|ServerSignature Off)\s*$/m', '# $1  (not allowed by this host)', $block ),
	);
	$result    = hbl_installer_apply( $root_file, $variants, array( home_url( '/' ), includes_url( 'css/dashicons.min.css' ) ) );
	if ( 'full' === $result ) {
		$report[] = array( 'ok', 'Root .htaccess updated: directory listing off, security headers on, readme.html and version files blocked, wp-includes locked. Site tested OK afterwards.' );
	} elseif ( 'reduced' === $result ) {
		$report[] = array( 'warn', 'Root .htaccess updated, but this host does not allow "Options -Indexes" in .htaccess. Headers and file blocks are on. For directory listing, the uploads step below or the host must cover it (ask them to disable Indexes).' );
	} elseif ( 'untested' === $result ) {
		$report[] = array( 'warn', 'Root .htaccess updated, but the site could not load itself to test it (the host blocks loopback requests). Open the homepage now. If it shows a 500 error, rename .htaccess.hbl-backup back to .htaccess.' );
	} else {
		$report[] = array( 'fail', 'Root .htaccess: ' . $result );
	}

	// 3. uploads/.htaccess: no listing, no code execution.
	$up         = wp_upload_dir();
	$probe      = trailingslashit( $up['basedir'] ) . 'hbl-probe.txt';
	$probe_url  = trailingslashit( $up['baseurl'] ) . 'hbl-probe.txt';
	@file_put_contents( $probe, 'ok' );
	$ublock     = "# BEGIN " . HBL_MARK . "\n" . file_get_contents( $payload . '/uploads.htaccess' ) . "# END " . HBL_MARK . "\n";
	$result     = hbl_installer_apply(
		trailingslashit( $up['basedir'] ) . '.htaccess',
		array(
			'full'    => $ublock,
			'reduced' => preg_replace( '/^Options -Indexes\s*$/m', '# Options -Indexes  (not allowed by this host)', $ublock ),
		),
		array( $probe_url )
	);
	@unlink( $probe );
	if ( 'full' === $result || 'untested' === $result ) {
		$report[] = array( 'untested' === $result ? 'warn' : 'ok', 'Uploads protected: folder listing off and PHP cannot run from /uploads/.' . ( 'untested' === $result ? ' (Could not self-test; check that an image in the Media Library still loads.)' : '' ) );
	} elseif ( 'reduced' === $result ) {
		@file_put_contents( trailingslashit( $up['basedir'] ) . 'index.php', "<?php\n// Silence is golden.\n" );
		$report[] = array( 'warn', 'Uploads: PHP execution blocked. Host disallows "Options" so an index.php was added to /uploads/ instead to stop the listing; ask the host to disable Indexes to cover the year folders too.' );
	} else {
		$report[] = array( 'fail', 'Uploads .htaccess: ' . $result );
	}

	// 4. Keep WP File Manager auto-updated.
	$auto = (array) get_site_option( 'auto_update_plugins', array() );
	if ( ! in_array( 'wp-file-manager/file_folder_manager.php', $auto, true ) ) {
		$auto[] = 'wp-file-manager/file_folder_manager.php';
		update_site_option( 'auto_update_plugins', $auto );
	}
	$report[] = array( 'ok', 'Auto-updates turned on for WP File Manager.' );

	update_option( 'hbl_installer_report', $report, false );
}

/**
 * Writes $variants in order into $file between HBL markers, placed above
 * "# BEGIN WordPress", and loads $urls after each. Returns the name of the
 * first variant that doesn't produce a 5xx, 'untested' if the site can't
 * reach itself, or an error string after restoring the original file.
 */
function hbl_installer_apply( $file, $variants, $urls ) {
	$orig = file_exists( $file ) ? file_get_contents( $file ) : '';
	if ( file_exists( $file ) ? ! is_writable( $file ) : ! is_writable( dirname( $file ) ) ) {
		return 'not writable by WordPress. Paste the block in by hand (README step 2).';
	}
	if ( '' !== $orig && ! file_exists( $file . '.hbl-backup' ) ) {
		@copy( $file, $file . '.hbl-backup' );
	}
	// Drop any earlier copy of our block so re-running doesn't stack them.
	$base = preg_replace( '/# BEGIN ' . HBL_MARK . '.*?# END ' . HBL_MARK . "\n?/s", '', $orig );

	foreach ( $variants as $name => $block ) {
		file_put_contents( $file, rtrim( $block ) . "\n\n" . ltrim( $base ) );
		$verdict = hbl_installer_probe( $urls );
		if ( 'ok' === $verdict ) {
			return $name;
		}
		if ( 'unreachable' === $verdict ) {
			return 'untested';
		}
	}
	'' === $orig ? @unlink( $file ) : file_put_contents( $file, $orig );
	return 'every version caused a server error on this host, so the original file was restored. Nothing changed.';
}

function hbl_installer_probe( $urls ) {
	foreach ( $urls as $url ) {
		$r = wp_remote_get( add_query_arg( 'hbl', wp_rand(), $url ), array( 'timeout' => 15, 'sslverify' => false, 'redirection' => 3 ) );
		if ( is_wp_error( $r ) ) {
			return 'unreachable';
		}
		if ( wp_remote_retrieve_response_code( $r ) >= 500 ) {
			return 'broken';
		}
	}
	return 'ok';
}

// Show the report once, then switch the installer off.
add_action(
	'admin_notices',
	function () {
		$report = get_option( 'hbl_installer_report' );
		if ( ! $report || ! current_user_can( 'activate_plugins' ) ) {
			return;
		}
		$icons = array( 'ok' => '&#x2705;', 'warn' => '&#x26A0;&#xFE0F;', 'fail' => '&#x274C;' );
		echo '<div class="notice notice-info"><h2>Security hardening installed</h2><ul>';
		foreach ( $report as list( $level, $msg ) ) {
			echo '<li>' . $icons[ $level ] . ' ' . esc_html( $msg ) . '</li>';
		}
		echo '</ul><p>The installer has switched itself off. You can delete it from the Plugins page. Next: replace the admin account and turn on 2FA (README steps 1 and 4).</p></div>';
		delete_option( 'hbl_installer_report' );
		require_once ABSPATH . 'wp-admin/includes/plugin.php';
		deactivate_plugins( plugin_basename( __FILE__ ), true );
	}
);

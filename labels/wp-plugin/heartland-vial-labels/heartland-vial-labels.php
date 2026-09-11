<?php
/*
Plugin Name: Heartland Vial Labels
Description: Serves the vial label printer at /labels/ for order fulfillment. One label per vial, decoded from HBL SKUs or entered by hand.
Version: 1.0.0
Author: Heartland Bio Labs
*/

if (!defined('ABSPATH')) exit;

add_action('init', function () {
    add_rewrite_rule('^labels/?$', 'index.php?hbl_labels=1', 'top');
});

add_filter('query_vars', function ($vars) {
    $vars[] = 'hbl_labels';
    return $vars;
});

add_action('template_redirect', function () {
    if (get_query_var('hbl_labels')) {
        header('Content-Type: text/html; charset=utf-8');
        header('X-Robots-Tag: noindex');
        readfile(__DIR__ . '/labels.html');
        exit;
    }
});

/* The /labels/ rewrite only exists after a rules flush, so flush on
   activation and clean up on deactivation. */
register_activation_hook(__FILE__, function () {
    add_rewrite_rule('^labels/?$', 'index.php?hbl_labels=1', 'top');
    flush_rewrite_rules();
});
register_deactivation_hook(__FILE__, 'flush_rewrite_rules');

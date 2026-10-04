#!/bin/sh
# Builds a throwaway WordPress + WooCommerce + Rank Math site on SQLite in
# $WP_TEST_DIR (default: /tmp/ps-wp-test), with the plugin as a must-use
# plugin and products shaped like the live store, then serves it on :8099.
# Needs php (pdo_sqlite), git, curl, unzip and composer. Run checks.sh next.
set -e
REPO=$(cd "$(dirname "$0")/../.." && pwd)
D=${WP_TEST_DIR:-/tmp/ps-wp-test}
mkdir -p "$D" && cd "$D"
# Pinned to the versions these checks were last verified against, so an
# upstream change can't turn the suite red on its own. Override to test newer.
WP_REF=${WP_REF:-c60008af38f111f1a4ec3a1ad4ee495f5d00c6b7}            # WordPress 7.2-alpha
SQLITE_REF=${SQLITE_REF:-4163f69f3d543ec7d6085bbb0c4e0c36b36c0156}
RANKMATH_REF=${RANKMATH_REF:-4b5ba3e2b754adfd4e0763909e93c61e6fdf7d96}  # Rank Math 1.0.279
WC_VERSION=${WC_VERSION:-11.1.2}
fetch() { [ -d "$3" ] || { mkdir "$3" && git -C "$3" init -q && git -C "$3" fetch -q --depth 1 "https://github.com/$1.git" "$2" && git -C "$3" checkout -q FETCH_HEAD; }; }
fetch WordPress/WordPress "$WP_REF" wordpress
fetch WordPress/sqlite-database-integration "$SQLITE_REF" sqlite
fetch rankmath/seo-by-rank-math "$RANKMATH_REF" rankmath
[ -f woocommerce.zip ] || curl -sSfL -o woocommerce.zip "https://github.com/woocommerce/woocommerce/releases/download/$WC_VERSION/woocommerce.zip"
[ -f wp-cli.phar ] || curl -sSL -o wp-cli.phar https://raw.githubusercontent.com/wp-cli/builds/gh-pages/phar/wp-cli.phar
P=$D/wordpress/wp-content/plugins
[ -d "$P/sqlite-database-integration" ] || cp -rL sqlite/packages/plugin-sqlite-database-integration "$P/sqlite-database-integration"
sed -e "s#{SQLITE_IMPLEMENTATION_FOLDER_PATH}#$P/sqlite-database-integration#; s#{SQLITE_PLUGIN}#sqlite-database-integration/load.php#" "$P/sqlite-database-integration/db.copy" > wordpress/wp-content/db.php
[ -d "$P/woocommerce" ] || (cd "$P" && unzip -q "$D/woocommerce.zip")
# The GitHub mirror's classmap lags its source; rebuild it.
[ -d "$P/seo-by-rank-math" ] || { cp -r rankmath "$P/seo-by-rank-math"; (cd "$P/seo-by-rank-math" && composer dump-autoload -q); }
mkdir -p wordpress/wp-content/mu-plugins
cp "$REPO/wordpress/peptide-store.php" wordpress/wp-content/mu-plugins/
[ -f wordpress/wp-config.php ] || sed "s/database_name_here/wp/; s/username_here/u/; s/password_here/p/" wordpress/wp-config-sample.php > wordpress/wp-config.php
cat > router.php <<'PHP'
<?php
$f = __DIR__ . '/wordpress' . parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
if (is_file($f)) return false;
chdir(__DIR__ . '/wordpress'); require 'index.php';
PHP
W="php wp-cli.phar --allow-root --path=wordpress"
rm -rf wordpress/wp-content/database
$W core install --url=http://127.0.0.1:8099 --title="Heartland Bio Labs" --admin_user=admin --admin_password=admin --admin_email=admin@example.com --skip-email >/dev/null
$W plugin activate woocommerce seo-by-rank-math >/dev/null
$W theme activate twentynineteen >/dev/null   # classic theme, like the live store's
$W rewrite structure '/%postname%/' >/dev/null
$W option update woocommerce_coming_soon no >/dev/null
$W option update rank_math_is_configured 1 >/dev/null
$W option update rank_math_registration_skip 1 >/dev/null   # Rank Math stays inert on the front end until registration is done or skipped
$W eval-file "$REPO/wordpress/test/seed.php"
pkill -f "php -S 127.0.0.1:8099" 2>/dev/null || true
(php -S 127.0.0.1:8099 -t wordpress router.php > server.log 2>&1 &)
sleep 1
echo "Test site: http://127.0.0.1:8099 (admin/admin) in $D"

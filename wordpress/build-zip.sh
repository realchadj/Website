#!/bin/sh
# Packages the plugin for Plugins → Add New → Upload Plugin.
# CI fails if dist/peptide-store.zip doesn't match wordpress/peptide-store.php.
set -e
cd "$(dirname "$0")/.."
tmp=$(mktemp -d)
mkdir "$tmp/peptide-store"
cp wordpress/peptide-store.php "$tmp/peptide-store/"
rm -f dist/peptide-store.zip
(cd "$tmp" && zip -qX -r - peptide-store) > dist/peptide-store.zip
rm -rf "$tmp"
echo "dist/peptide-store.zip"

#!/usr/bin/env bash
# Packages installer/ + the kit files into dist/hbl-hardening-installer.zip,
# ready for Plugins -> Add New -> Upload Plugin.
set -euo pipefail
cd "$(dirname "$0")"
tmp=$(mktemp -d); d="$tmp/hbl-hardening-installer"
mkdir -p "$d/payload" dist
cp installer/hbl-hardening-installer.php "$d/"
cp mu-plugins/hbl-hardening.php htaccess/root-htaccess-block.txt htaccess/uploads.htaccess "$d/payload/"
rm -f dist/hbl-hardening-installer.zip
(cd "$tmp" && zip -qrX - hbl-hardening-installer) > dist/hbl-hardening-installer.zip
rm -rf "$tmp"
echo "dist/hbl-hardening-installer.zip"

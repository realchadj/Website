#!/usr/bin/env bash
# Checks a live WordPress site for the issues in the security audit.
#
#   bash verify.sh https://example.com
#
# Read-only: only GET requests, plus one XML-RPC request with a made-up login
# that can't match any account. Run it before and after each change.

set -u
SITE="${1:?usage: bash verify.sh https://your-site.com}"
SITE="${SITE%/}"
UA="Mozilla/5.0 (security-check)"
pass=0; fail=0; warn=0

ok()   { printf '  \033[32mPASS\033[0m  %s\n' "$1"; pass=$((pass+1)); }
bad()  { printf '  \033[31mFAIL\033[0m  %s\n' "$1"; fail=$((fail+1)); }
note() { printf '  \033[33mWARN\033[0m  %s\n' "$1"; warn=$((warn+1)); }

get()     { curl -s -A "$UA" --max-time 20 "$@"; }
status()  { get -o /dev/null -w '%{http_code}' "$1"; }
headers() { get -D - -o /dev/null "$1"; }

echo "Checking $SITE"
echo
echo "1. Usernames and origin IP"
code=$(status "$SITE/wp-json/wp/v2/users")
if [[ "$code" == 401 || "$code" == 403 || "$code" == 404 ]]; then ok "/wp-json/wp/v2/users blocked ($code)"; else bad "/wp-json/wp/v2/users is public ($code)"; fi
code=$(status "$SITE/?rest_route=/wp/v2/users")
if [[ "$code" == 401 || "$code" == 403 || "$code" == 404 ]]; then ok "?rest_route=/wp/v2/users blocked ($code)"; else bad "?rest_route=/wp/v2/users is public ($code)"; fi
loc=$(get -o /dev/null -w '%{redirect_url}' "$SITE/?author=1")
if [[ "$loc" == *"/author/"* ]]; then bad "?author=1 reveals a login: $loc"; else ok "?author=1 does not reveal a login"; fi
code=$(status "$SITE/wp-sitemap-users-1.xml")
if [[ "$code" == 200 ]]; then bad "wp-sitemap-users-1.xml lists users"; else ok "users sitemap not served ($code)"; fi
oembed=$(get "$SITE/" | grep -o '<link[^>]*application/json+oembed[^>]*>' | head -1 | sed -E 's/.*href="([^"]+)".*/\1/; s/&#038;/\&/g; s/&amp;/\&/g')
[[ -z "$oembed" ]] && oembed="$SITE/wp-json/oembed/1.0/embed?url=$SITE/?p=1"
if get "$oembed" | grep -q '"author_url"'; then bad "oEmbed exposes author_url"; else ok "oEmbed has no author data"; fi

echo
echo "2. Directory listing"
for dir in wp-content/uploads/ wp-includes/ wp-content/plugins/ wp-content/uploads/$(date +%Y)/; do
  if get "$SITE/$dir" | grep -qi '<title>Index of'; then bad "/$dir is browsable"; else ok "/$dir not browsable"; fi
done

echo
echo "3. Firewall / CDN"
h=$(headers "$SITE/")
if grep -qi '^cf-ray:' <<<"$h"; then ok "Behind Cloudflare"; else bad "No CDN/WAF in front of the site (no cf-ray header)"; fi
code=$(status "$SITE/?s=%3Cscript%3Ealert(1)%3C%2Fscript%3E%27%20OR%201%3D1--")
if [[ "$code" == 403 ]]; then ok "Test attack string blocked (403)"; else note "Test attack string got $code (turn on Cloudflare managed WAF rules)"; fi

echo
echo "4. Login brute force"
xml='<?xml version="1.0"?><methodCall><methodName>wp.getUsersBlogs</methodName><params><param><value>no-such-user-x9</value></param><param><value>x</value></param></params></methodCall>'
r=$(get -H 'Content-Type: text/xml' --data "$xml" "$SITE/xmlrpc.php")
if grep -q '<int>405</int>' <<<"$r" || [[ -z "$r" ]] || grep -qi 'forbidden' <<<"$r"; then ok "XML-RPC logins disabled"; else bad "XML-RPC accepts login attempts"; fi
note "2FA can't be checked from outside. Confirm it by logging in (README step 4)."

echo
echo "5. Security headers"
for hdr in strict-transport-security x-content-type-options referrer-policy x-frame-options; do
  if grep -qi "^$hdr:" <<<"$h"; then ok "$hdr"; else bad "$hdr missing"; fi
done

echo
echo "6. Version leaks"
code=$(status "$SITE/readme.html")
if [[ "$code" == 200 ]]; then bad "readme.html is public"; else ok "readme.html not served ($code)"; fi
code=$(status "$SITE/license.txt")
if [[ "$code" == 200 ]]; then bad "license.txt is public"; else ok "license.txt not served ($code)"; fi
server=$(grep -i '^server:' <<<"$h" | tr -d '\r')
if grep -qiE '[0-9]+\.[0-9]+' <<<"$server"; then bad "Server header shows a version: $server"; else ok "Server header has no version (${server:-absent})"; fi
if grep -qi '^x-powered-by:' <<<"$h"; then bad "$(grep -i '^x-powered-by:' <<<"$h" | tr -d '\r')"; else ok "No X-Powered-By header"; fi
if get "$SITE/" | grep -qi 'name="generator"'; then bad "Homepage has a generator meta tag"; else ok "No generator meta tag"; fi

echo
echo "7. Code execution in uploads"
code=$(status "$SITE/wp-content/uploads/hbl-probe.php")
if [[ "$code" == 403 ]]; then ok "PHP in uploads is denied (403)"; else note "PHP in uploads returned $code (expected 403 once uploads.htaccess is in place)"; fi

echo
printf 'Passed %d, failed %d, warnings %d\n' "$pass" "$fail" "$warn"
[[ $fail -eq 0 ]]

# WordPress security hardening kit

Fixes for every item in the security audit. The code fixes are in this folder
and were tested against a live WordPress install on Apache. The account,
Cloudflare, 2FA and backup steps need someone logged into the dashboard or the
host, so they're written out below.

| Audit item | Fixed by | Who |
|---|---|---|
| Admin username public via `/wp-json/wp/v2/users` | `mu-plugins/hbl-hardening.php` + step 1 | code + you |
| Server IP public | step 3 (Cloudflare + origin lock) | you + host |
| Directory listing on uploads / wp-includes | `htaccess/root-htaccess-block.txt` | code |
| No firewall / CDN | step 3 | you |
| No 2FA | step 4 | you |
| WP File Manager risk | `mu-plugins/hbl-hardening.php` (auto-off after 3 h) | code |
| No security headers | `htaccess/root-htaccess-block.txt` | code |
| No backups detected | step 6 | you + host |
| `readme.html`, Server header leak versions | `.htaccess` block + step 3/5 | code + host |

The kit does more than the audit asked for, because each extra item closes a
path around a fix you asked for:

- `?author=1`, `/author/<login>/`, the users sitemap and oEmbed also reveal
  the login name. Blocking only `/wp-json/wp/v2/users` would leave four more
  places showing it.
- **XML-RPC login attempts are turned off.** `xmlrpc.php` lets an attacker
  try hundreds of passwords in one request, so it undercuts both 2FA plugins
  and login rate limits.
- **Login errors are the same for every failure.** WordPress normally says
  "unknown username", which confirms which usernames exist.
- **PHP can't run from `/uploads/`.** A malicious file uploaded through File
  Manager or a form plugin (a "webshell") can't execute.

Run `bash verify.sh https://your-site.com` before you start and after each
step. On an untouched WordPress install it fails 17 checks. With this kit
installed, only two fail: the Cloudflare check and the Server-header check.
Steps 3 and 5 fix those.

---

## Before anything: take a backup

Step 6 in full comes later, but get one copy now. In the host's control panel,
make a full backup (files + database) and download it. If you can't find the
option, ask the host for one before continuing.

## Step 1 — Replace the admin account (10 min)

WordPress can't rename a login, so create a new admin account and delete the
old one. Nothing is lost: WordPress moves all posts, pages and products to the
new account.

1. **Users → Add New User**
   - Username: something nobody could guess and you've never used publicly.
     Not "admin", not the business name, not your name.
     A random word pair plus digits works, e.g. `copper-lantern-4817`.
   - Email: a different address from the old account's. WordPress won't
     allow a duplicate.
   - Password: generate one with the password manager.
   - Role: **Administrator**.
2. Log out, then log in as the new user. Confirm you can reach **Plugins** and
   **WooCommerce → Settings**.
3. **Users → All Users** → hover the old admin account → **Delete**
   → pick **"Attribute all content to:"** the new user → **Confirm Deletion**.
4. Now that the old address is free, change the new user's email to the one
   you want.
5. On the new user's profile:
   - Set **Nickname** to something like "HBL Team", and set
     **Display name publicly as** to that. Never show the login name.
   - Leave the **Website** field blank. If the server IP showed up in the
     users endpoint, it probably came from this field or from
     **Settings → General**. Don't change the WordPress Address or Site
     Address fields unless you're sure. The wrong value there takes the site
     offline.
6. Check for other admins in **Users → All Users → Administrator**. Delete any
   you don't recognize, and downgrade any that don't need admin.

Anyone else who logs in with the old account (including the File Manager
workflow) needs the new login.

## Step 2 — Install the code fixes (10 min)

You'll need WP File Manager active for this (or the host's file manager / FTP).

1. **Must-use plugin.** Open `wp-content/`. Create a folder called
   `mu-plugins` if it doesn't exist. Upload `mu-plugins/hbl-hardening.php`
   into it. It loads automatically. You'll see it under
   **Plugins → Must-Use**, and it can't be switched off from the dashboard by
   accident.
2. **Root `.htaccess`.** In the WordPress root (the folder with
   `wp-config.php`):
   - Download a copy of `.htaccess` first as a backup.
   - Edit it and paste the full contents of `htaccess/root-htaccess-block.txt`
     at the very top, above `# BEGIN WordPress`. Save.
   - Load the homepage, a product, the cart and `/wp-admin/`.
   - **If you get a 500 error**, the host doesn't allow `Options` in
     `.htaccess`. Delete the `Options -Indexes` line and save. To stop the
     directory listings instead, upload an empty file named `index.php` into
     `wp-content/uploads/` and each year folder inside it (`2024`, `2025`,
     `2026`...). Or ask the host to turn off directory indexes. Everything
     else in the block still works.
3. **Uploads `.htaccess`.** Upload `htaccess/uploads.htaccess` into
   `wp-content/uploads/` and rename it to `.htaccess`. If there's already one
   there (Wordfence and some backup plugins add one), paste the contents in
   at the top instead of replacing it.
4. Run `verify.sh` again. Sections 1, 2, 4, 5 and 7 should pass.

**Opt-outs** (add to `wp-config.php` above "That's all, stop editing!"):

```php
define( 'HBL_ALLOW_XMLRPC', true );      // only if you use Jetpack or the WordPress mobile app
define( 'HBL_FILE_MANAGER_TTL', 7200 );  // change File Manager auto-off to 2 h (0 = never)
```

> The Sep 9 deploy wiped custom code once. Files in `mu-plugins/` and the
> section of `.htaccess` above `# BEGIN WordPress` survive WordPress, theme
> and plugin updates. A deploy that overwrites the whole server does not.
> This folder is the master copy, so re-upload from here if that happens.

## Step 3 — Cloudflare (30 min + DNS wait)

This adds a firewall (WAF), hides the server IP from new lookups, absorbs bot
traffic, and replaces the `Server: Apache/x.y` header with `Server: cloudflare`.

1. Sign up at cloudflare.com → **Add a site** → enter the domain → **Free** plan.
2. Cloudflare imports your DNS records. Compare them with your current DNS
   (at the registrar or host) and make sure every record is there, **especially
   MX, TXT (SPF/DKIM/DMARC) and any mail records**. A missing MX record
   stops your email.
3. Set the `A`/`AAAA`/`CNAME` records for the domain and `www` to
   **Proxied** (orange cloud). Leave mail records **DNS only** (grey).
4. At the registrar, change the nameservers to the two Cloudflare gives you.
   Allow up to 24 h (usually under 1 h).
5. Once active, in the Cloudflare dashboard:
   - **SSL/TLS → Overview → Full (strict).** Never "Flexible", which causes
     redirect loops on WordPress and leaves the Cloudflare-to-server leg
     unencrypted. If "Full (strict)" breaks the site, the server certificate
     is missing or expired. Ask the host to fix it, or install a
     Cloudflare **Origin Certificate**.
   - **SSL/TLS → Edge Certificates → Always Use HTTPS: On**.
   - **Security → WAF → Managed rules**: turn on the Cloudflare Free Managed
     Ruleset.
   - **Security → Bots → Bot Fight Mode: On.** If a payment gateway or
     shipping webhook starts failing afterwards, turn this back off.
   - **Security → WAF → Rate limiting rules** → create one: URI path
     equals `/wp-login.php`, 5 requests per 10 seconds per IP → Block for
     10 s (the free plan's limits).
   - **Caching:** don't use "Cache Everything" on a WooCommerce site. The
     default caches only static files, which is what you want.
6. **Close the back door.** The current server IP is already public, so
   attackers can skip Cloudflare by connecting to the IP directly. Either:
   - Ask the host: *"Please restrict ports 80/443 to Cloudflare's IP ranges
     (cloudflare.com/ips) and, if possible, assign a new IP once that's done."*
     This is the best option. Or:
   - Paste `htaccess/cloudflare-only-origin.txt` into the top of `.htaccess`
     (read the warnings in that file first).
7. If you use a login-limit or security plugin, set it to read the visitor IP
   from `CF-Connecting-IP`. Otherwise every visitor looks like a Cloudflare IP
   and one lockout blocks everyone. Wordfence: **All Options → General →
   How does Wordfence get IPs → CF-Connecting-IP**.

`verify.sh` section 3 should now pass. The test attack string should return
403 once the managed ruleset is on.

## Step 4 — Two-factor authentication (5 min per admin)

Install **Two Factor** (by "WordPress.org Contributors", the plugin maintained
by WordPress core developers) from **Plugins → Add New**. Or, if you move to
Wordfence, use its built-in **Login Security** module instead of both.

1. Activate → **Users → Profile** → **Two-Factor Options**.
2. Enable **Authenticator app**. Scan the QR code with Google Authenticator,
   1Password, Authy or similar, and enter the code.
3. Enable **Backup Verification Codes**. Generate them, print them and store
   them offline. They're the only way back in if the phone is lost.
4. Set it as primary. Log out and back in to confirm it asks for a code.
5. Repeat for every Administrator and Shop Manager account.

Don't use email as the only second factor. If the email account gets taken
over, the attacker gets both factors.

## Step 5 — Server header (ask the host, 1 email)

`.htaccess` can't hide Apache's version: `ServerTokens` only works in the
server's main config. Cloudflare (step 3) already covers it for anyone going
through Cloudflare. For direct hits, send the host:

> *"Please set `ServerTokens Prod` and `ServerSignature Off` for our site, and
> `expose_php = Off` in PHP. Also confirm whether you run daily off-site
> backups (see below)."*

Delete `readme.html`, `license.txt` and `wp-config-sample.php` from the root
too. The `.htaccess` block already stops them loading, and core updates put
them back, so this is optional.

## Step 6 — Backups (20 min)

Ask the host three questions: **How often? Kept for how long? Stored on a
different server?** "Daily, 30 days, off-site" is the minimum. Most budget
plans are weekly, and many store backups on the same server, which is lost
along with it.

Either way, add your own backup:

1. Install **UpdraftPlus** → **Settings → UpdraftPlus Backups → Settings**.
2. Files: **Daily**, retain **14**. Database: **Daily**, retain **30**. On a
   busy store, set the database to every 12 h.
3. Remote storage: **Google Drive**, **Dropbox** or **Backblaze B2** (cheapest
   for large media libraries). Never "none", because a backup on the same
   server is lost with the server.
4. **Backup Now** once to confirm it reaches remote storage.
5. Once a quarter, restore a backup to a staging copy to prove it works. A
   backup you've never restored is a guess.

Before any deploy (the Sep 9 incident), run **Backup Now** manually.

## Step 7 — WP File Manager routine

The must-use plugin switches File Manager off 3 hours after it's activated.
While it's on, a yellow banner shows the time left. It works even if nobody
visits the dashboard, because any page view triggers the check.

- Activate it only when you need it. Deactivate it yourself when you're done;
  the 3-hour timer is a safety net.
- Keep it updated. Turn on **auto-updates** for it on the Plugins page. Its
  past critical flaws were exploited within days of disclosure.
- For regular work, prefer the host's own file manager or SFTP. They aren't
  reachable through WordPress at all.

---

## What's in the must-use plugin

`mu-plugins/hbl-hardening.php`. Every change is a WordPress filter or action;
nothing touches the database except one stored timestamp for File Manager.

- `/wp-json/wp/v2/users` (and `?rest_route=` form) returns 401 to logged-out
  visitors; logged-in editors keep it (the block editor needs it)
- `?author=N` and `/author/<login>/` redirect to the homepage; author links
  point to the homepage
- Users removed from `wp-sitemap.xml`; author removed from oEmbed data
- Login errors are the same for wrong username, wrong email and wrong password
  (wp-login.php and WooCommerce My Account)
- XML-RPC login methods disabled (pingbacks unaffected); `X-Pingback` removed
- WordPress version removed from the generator tag, RSS, and `?ver=` on core
  CSS/JS (replaced with a hash that still changes on update, so caching works)
- `X-Powered-By` (PHP version) removed
- WP File Manager auto-deactivates after `HBL_FILE_MANAGER_TTL` (default 3 h)

If you use Yoast or Rank Math, also turn off author archives there
(**Yoast → Settings → Advanced → Author archives → off**). That drops the
author sitemap they generate themselves.

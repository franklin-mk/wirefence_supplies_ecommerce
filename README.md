# WireFence Supplies: wire fencing e-commerce

Full-stack store for barbed wire, chain link, weld mesh, gate wire and fencing posts.
Next.js 14 (App Router, TypeScript) · Tailwind · Supabase (Postgres + RLS + Auth) · Cloudinary · M-Pesa STK Push · Resend/Nodemailer · Leaflet/OpenStreetMap.

## Features

| Area | What is built |
|---|---|
| Storefront | Guest browsing, search, category filter, variants (gauge / roll length / aperture), local guest cart, wishlist (local, synced on login), transport estimator |
| Product page | Swipe gallery + thumbnails + full-screen zoom lightbox, tabs (Overview, Specifications, Delivery & Transport, Reviews), related products, sticky mobile action bar, WhatsApp pre-filled order message |
| Reviews | 1–5 star breakdown, text + image reviews, threaded replies (owner and user-to-user), admin moderation |
| Theme | `prefers-color-scheme` auto-detect, persistent manual toggle, zero-FOUC inline script |
| Mobile | Slide-out drawer (categories + theme toggle), floating WhatsApp button on every page |
| Checkout | Login required only here, full Kenyan delivery details + GPS drop pin, mandatory email verification, server-side re-pricing and stock check |
| Payments | M-Pesa STK Push (sandbox), callback marks `PENDING_PAYMENT → PAID / FAILED`, idempotent, amount check, retry from the order page, provider interface ready for live Paybill/Till |
| Receipts | PDF receipt (pdfkit) emailed on payment confirmation |
| Tracking | Order timeline + live lorry map; driver opens a secret link and streams GPS |
| Admin | `/admin` with RBAC + email OTP on every login, HTTP-only 7–14 day session cookie, product/stock/price CRUD with Cloudinary uploads, order fulfilment, manual payment confirmation, driver dispatch + tracker link, review moderation |

## Project structure

```
supabase/migrations/    0001_schema.sql (tables, RLS, functions)  0002_seed.sql (sample catalogue)
src/middleware.ts       Session refresh, checkout/account gating, admin OTP-cookie gate
src/lib/                supabase clients, admin-session (HMAC cookie), guards, mpesa, email, receipt-pdf, orders, transport, cloudinary
src/app/api/            checkout, mpesa/{callback,retry}, orders/[id]/track, driver/[token], uploads/sign, admin/{otp,orders,products,reviews,logout}
src/app/                storefront, products/[slug], cart, checkout, orders, wishlist, login/register, driver/[token], admin/*
src/components/         header (drawer), gallery, product-view, reviews, checkout-form, order-tracker, map, admin/*
src/store/              Zustand cart + wishlist (localStorage persisted)
```

## Quick start

```bash
npm install
cp .env.example .env.local     # then fill in the values (guides below)
npm run dev                    # http://localhost:3000
```

## 1. Supabase

1. Create a project at <https://supabase.com>.
2. **SQL Editor** → run `supabase/migrations/0001_schema.sql`, then `0002_seed.sql` (sample products; optional).
3. **Project Settings → API**: copy the Project URL, `anon` key and `service_role` key into `.env.local`. The service-role key is server-only; never expose it.
4. **Authentication → URL Configuration**: Site URL = `http://localhost:3000` (your domain in production). Add Redirect URL `http://localhost:3000/auth/callback` (and the production equivalent).
5. **Authentication → Providers → Email**: keep **Confirm email ON**. This is what enforces mandatory email verification; the checkout API also rejects unverified users.
6. **Google OAuth** (optional): create an OAuth client in Google Cloud Console (Web). Authorised redirect URI = `https://YOUR-PROJECT.supabase.co/auth/v1/callback`. Paste client ID/secret in **Providers → Google**.
7. Supabase's built-in mailer is rate-limited. For real use, set **Authentication → SMTP** to Resend (see section 4).
8. **Create your admin**: sign up on the site once, verify the email, then run in the SQL editor:
   ```sql
   update public.profiles set role='admin'
   where id = (select id from auth.users where email='you@example.com');
   ```
   Then sign in at `/admin/login` (password, then 6-digit email code).

Row Level Security is enabled on every table. Browser clients can only read the public catalogue and approved reviews, and only their own orders/wishlist. Payments, OTPs, receipts and driver GPS run in server routes with the service-role key.

## 2. Cloudinary

1. Sign up at <https://cloudinary.com>. From the Dashboard copy **Cloud name**, **API key**, **API secret**.
2. Fill `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`.
3. Uploads use **signed direct upload** from the browser (`/api/uploads/sign` gates it: admins for products, signed-in users for review photos). Delivery URLs get `f_auto,q_auto` injected, so images are served as WebP/AVIF automatically.

## 3. M-Pesa (Daraja sandbox)

1. Create an account at <https://developer.safaricom.co.ke> → **My Apps → Add a new app**, tick **Lipa na M-Pesa Sandbox**.
2. Copy the app's **Consumer Key** and **Consumer Secret**.
3. Sandbox values are already in `.env.example`: shortcode `174379` and the public sandbox passkey.
4. Safaricom must reach your callback over **public HTTPS**. Locally, run `ngrok http 3000` and set
   `MPESA_CALLBACK_URL=https://<id>.ngrok-free.app/api/mpesa/callback`.
5. Set `MPESA_CALLBACK_SECRET` to any long random string. It is appended as `?token=` and checked on every callback, because Daraja does not sign callbacks.
6. Test with the sandbox test number **254708374149**. Use the Daraja simulator to approve the prompt; real phones do not receive sandbox pushes.
7. **Going live (v2)**: payment code sits behind the `PaymentProvider` interface (`src/lib/payments/mpesa.ts`). Switch `MPESA_ENV=production`, then set your live `MPESA_SHORTCODE`, `MPESA_PASSKEY` and Daraja production keys. For a Till number use `MPESA_TRANSACTION_TYPE=CustomerBuyGoodsOnline`. Checkout code does not change.

Order flow: `PENDING_PAYMENT` → callback → `PAID` (stock decremented, receipt emailed) or `FAILED` (customer can resend the prompt). Callbacks are idempotent, and underpaid amounts are rejected.

## 4. Email (Resend or SMTP/Nodemailer)

**Resend (default)**
1. Create a key at <https://resend.com>, set `EMAIL_PROVIDER=resend` and `RESEND_API_KEY`.
2. Verify your sending domain and set `EMAIL_FROM="Store <orders@yourdomain.com>"`. Until a domain is verified Resend only delivers to your own account email (test sender `onboarding@resend.dev`).
3. Optional: use Resend SMTP (`smtp.resend.com`, port 465, user `resend`, password = API key) in Supabase Auth SMTP settings so verification emails come from your domain too.

**SMTP via Nodemailer**: set `EMAIL_PROVIDER=smtp` and `SMTP_HOST/PORT/USER/PASS` (for Gmail use an App Password).

Email is used for: admin OTP codes, PDF receipts. Customer verification emails are sent by Supabase Auth.

## 5. Maps (Leaflet + OpenStreetMap, optional Mapbox)

Works out of the box with OpenStreetMap tiles; no key needed. Please follow the OSM tile usage policy for production traffic, or switch to Mapbox: create a public token at <https://account.mapbox.com> and set `NEXT_PUBLIC_MAPBOX_TOKEN`. The map automatically switches tile source.

## 6. Live lorry tracking: how it works

1. Admin opens a paid order → **Assign driver & dispatch**. This sets the order to `IN_TRANSIT` and generates a secret link `/driver/<token>` (valid 3 days) to send to the driver by WhatsApp.
2. Driver opens the link on their phone and taps **Start sharing my location**. The page uses the browser Geolocation API (HTTPS required, so test on a deployed or ngrok URL) and posts a fix every 5 seconds.
3. The customer's order page polls every 5 seconds and shows the lorry marker and the drop pin.
4. Admin marks **Delivered**. The link stops accepting updates.

## 7. Deploying

Deploy to Vercel (or any Node host). Add all variables from `.env.example`, set `NEXT_PUBLIC_SITE_URL` and `MPESA_CALLBACK_URL` to the production domain, and add the production domain to Supabase redirect URLs. `pdfkit` is marked as an external server package in `next.config.mjs`.

## Security notes

- Client prices are never trusted: checkout re-prices from the database and re-checks stock.
- Admin access needs **both** `profiles.role = 'admin'` **and** a valid HMAC-signed, HTTP-only OTP cookie. OTPs are hashed, single use, expire in 10 minutes, are limited to 5 tries, and codes are rate-limited.
- Driver links use 192-bit random tokens, expire and only work while the order is active.
- Rotate `ADMIN_SESSION_SECRET` to sign out every admin at once.

## Known limits / next steps

- Transport pricing in `src/lib/transport.ts` is a placeholder tariff by county zone and weight. Replace it with the supplier's real rates (or move it to a DB table).
- Stock is decremented when payment is confirmed, so two customers can both pay for the last unit. A reservation step would prevent that.
- Driver location is polled, not pushed. Supabase Realtime is already enabled on `driver_locations` if you want true push.
- No automated test suite is included yet.

# WooCommerce React Storefront

A modern green-and-white shop built with **React + Vite**, powered by your existing
**WordPress / WooCommerce** site. Products, categories, variations, cart, shipping, tax,
checkout, orders, pages and blog posts all come live from WordPress. There is no dummy data
anywhere, and **no WooCommerce API keys or secrets are used** (it only uses the public
Store API, the same one the WooCommerce checkout block uses).

| Page | Data source |
| --- | --- |
| Home, Shop, Product | `/wp-json/wc/store/v1/products`, `/products/categories` |
| Cart | `/wp-json/wc/store/v1/cart/*` |
| Checkout | `/wc/store/v1/cart/update-customer`, `/select-shipping-rate`, `/checkout` |
| Order confirmation | `/wc/store/v1/order/{id}` |
| About, Services, Contact | `/wp-json/wp/v2/pages?slug=…` |
| Blog | `/wp-json/wp/v2/posts` |

---

## 1. Quick start (local)

Requires **Node.js 18+**.

```bash
npm install
cp .env.example .env        # Windows: copy .env.example .env
```

Open `.env` and set your WordPress address:

```env
VITE_WP_URL=https://your-wordpress-site.com
```

```bash
npm run dev
```

Open <http://localhost:5173>. In development Vite **proxies `/wp-json` to your WordPress site**,
so you do not need any CORS setup locally.

### WordPress requirements

* WooCommerce (a recent version; the Store API and `/order/{id}` endpoint are part of core WooCommerce).
* Pretty permalinks enabled (Settings → Permalinks → anything except "Plain"), so `/wp-json/…` works.
* Test it: open `https://your-site.com/wp-json/wc/store/v1/products` in a browser. You should see JSON.
* Pages with the slugs `about`, `services` and `contact` for the content pages (change the slugs in `.env`).
  Blog posts are your normal WordPress posts.

### Optional but recommended: the helper plugin

Upload `wordpress-plugin/react-store-helper/` to `wp-content/plugins/` (or zip that folder and use
Plugins → Add New → Upload) and activate **React Store Helper**. It adds:

* a public `/wp-json/react-store/v1/config` endpoint, so the checkout shows **real country and state
  drop-downs** and **your payment method names and descriptions** exactly as set in WooCommerce;
* optional **CORS** support (see below).

Without it everything still works. Country/state become simple text fields and payment names are
derived from the gateway ID (e.g. `cod` → "Cash on delivery").

---

## 2. Settings (`.env`)

Only `VITE_WP_URL` is required. All values end up in the browser, so **never put secrets here**.

| Variable | Purpose |
| --- | --- |
| `VITE_WP_URL` | Your WordPress URL, no trailing slash |
| `VITE_BASE_PATH` | Only if hosted in a sub-folder, e.g. `/store/` |
| `VITE_PAGE_ABOUT` / `_SERVICES` / `_CONTACT` | Slugs of your WordPress pages |
| `VITE_DEFAULT_COUNTRY` | Default country code on the checkout (default `IN`) |
| `VITE_CF7_FORM_ID` | Contact Form 7 form ID to show a working contact form |
| `VITE_CONTACT_EMAIL` | Shows an "Email us" button and footer address |

> Contact Form 7 users: the form must use the fields `your-name`, `your-email`, `your-subject`
> and `your-message` (the CF7 defaults).

---

## 3. Build for production

```bash
npm run build
```

This creates the **`dist/`** folder, which is the complete website (static files). Preview it with
`npm run preview`.

## 4. Deploy

There are two ways to host it. **Option A is simplest** (no CORS, cart works like a normal shop).

### Option A: same domain as WordPress (recommended)

Put the React site in a sub-folder of your WordPress hosting, e.g. `https://your-site.com/store/`.

1. In `.env` set:
   ```env
   VITE_WP_URL=https://your-site.com
   VITE_BASE_PATH=/store/
   ```
2. `npm run build`
3. Upload the **contents of `dist/`** to a `store` folder in your hosting (cPanel File Manager or FTP),
   e.g. `public_html/store/`.
4. The included `.htaccess` (Apache/LiteSpeed) makes page refreshes work. For **Nginx** add:
   ```nginx
   location /store/ { try_files $uri $uri/ /store/index.html; }
   ```

You may leave `VITE_WP_URL` empty when it is the same domain.

### Option B0: Vercel (no CORS setup)

`vercel.json` forwards `/wp-json/*` to WordPress server-side, and `.env` has `VITE_API_PROXY=true`, so the browser only talks to your Vercel domain. If your WordPress URL changes, edit the `destination` in `vercel.json` and `VITE_WP_URL`. Also add `VITE_API_PROXY=true` in Vercel → Settings → Environment Variables if you don't commit `.env`.

### Option B: separate domain (Netlify, Vercel, Cloudflare Pages, another host)

1. Set `VITE_WP_URL=https://your-wordpress-site.com` and run `npm run build`.
2. Deploy `dist/` (build command `npm run build`, output directory `dist`; set `VITE_WP_URL` as an
   environment variable in the host's dashboard). `public/_redirects` already handles page refreshes on Netlify/Cloudflare;
   on Vercel add a rewrite of `/(.*)` → `/index.html`.
3. Install the **React Store Helper** plugin and add this to WordPress `wp-config.php`
   (above the line "That's all, stop editing"):
   ```php
   define( 'REACT_STORE_ALLOWED_ORIGINS', 'https://your-react-site.com' );
   ```
   Use the exact origin (scheme + domain, no path). Separate several with commas. This lets the
   browser call the WordPress API from your React domain.

---

## 5. How the cart and checkout work

* **Cart session**: WooCommerce returns a `Cart-Token` and `Nonce` with every cart response. They are
  stored in `localStorage` and sent back on each request, so the cart survives refreshes and works
  across domains without cookies. The cart is always the real WooCommerce cart; the browser never
  calculates prices or totals.
* **Shipping and tax**: as soon as the customer enters a country and postcode, the address is sent
  to WooCommerce (`update-customer`), which returns the real shipping rates and tax. Choosing a
  shipping method recalculates the totals.
* **Payment**: the payment methods shown are the ones WooCommerce says are available for that cart.
  "Place order" calls the real `/checkout` endpoint, which creates a real order. The confirmation page
  loads the order from WooCommerce and shows its real status. Nothing is faked on failure: errors
  from WooCommerce (stock, invalid postcode, payment failure…) are shown to the customer.

### Payment gateway compatibility (please read)

| Gateway type | Works? |
| --- | --- |
| Cash on delivery, bank transfer (BACS), cheque | Yes: order is created and the React confirmation page is shown |
| Redirect gateways (PayPal, hosted payment pages) | Yes: the customer is sent to the gateway to pay |
| Gateways that need card fields or a pop-up **on your page** (Stripe card fields, Razorpay pop-up, etc.) | **Not out of the box.** These plugins load their own JavaScript into WooCommerce's own checkout page and hand a token to the Store API. A plain React app cannot run that script. Use the gateway's redirect / hosted-page mode if it has one, or tell me which gateway you use and I can add a dedicated integration |

After paying at a redirect gateway, the customer returns to your **WordPress** "order received" page
(WooCommerce controls that URL). The order itself is correct and fully recorded.

---

## 6. Project structure

```
src/
  api/          http.js (fetch + cart token), store.js (WooCommerce), wp.js (WordPress)
  components/   Header, Footer, ProductCard, Price, QuantityInput, Pagination, …
  context/      CartContext (cart state), SiteContext (site info), ToastContext (messages)
  hooks/        useAsync (loading/error), useCategories, usePageTitle
  pages/        Home, Shop, ProductDetails, Cart, Checkout, OrderConfirmation, Blog, …
  styles/       base.css (colors + buttons + forms), layout.css, components.css, pages.css
  utils/        format.js (money/dates), sanitize.js (cleans WordPress HTML)
wordpress-plugin/react-store-helper/   optional helper plugin
```

**Change the colors**: edit the `--green-*` variables at the top of `src/styles/base.css`.

## 7. Troubleshooting

| Problem | Fix |
| --- | --- |
| "Could not reach the store" | Check `VITE_WP_URL`, that `/wp-json/wc/store/v1/products` opens in a browser, and (separate domain) the CORS setting above |
| Blank products, 404 on `/wp-json` | Permalinks are set to "Plain". Choose "Post name" |
| Page refresh gives 404 | The SPA fallback is missing: see the `.htaccess` / Nginx / `_redirects` notes |
| About / Services "page not found" | Create a WordPress page with that slug or change `VITE_PAGE_*` |
| Pagination shows odd page counts | Your host strips `X-WP-Total` headers; the helper plugin's CORS exposes them |
| Shipping says "no options" | Add a shipping zone covering that country in WooCommerce → Settings → Shipping |
| Cart empties unexpectedly | Some security or cache plugins block the `Cart-Token` header; whitelist `/wp-json/wc/store/` |

## 8. Notes on testing

The code was built and tested end to end (browse, search, filter, sort, variations, cart, coupon,
shipping and tax recalculation, checkout, confirmation, WordPress pages, mobile layout) against a
**local simulation of the WooCommerce Store API**, because the development environment cannot reach your
private site. Please run through one test order on your real store (cash on delivery first) before
going live.
"# react" 

# Nepali Threads — Admin Guide

A quick walkthrough of the things you'll do most often. The admin is built around your workflow, so most of it should feel obvious once you've done each thing once or twice. This doc is for the spots where it's not.

If anything looks broken or doesn't make sense, text Neal.

---

## Getting in

1. Go to **https://nepali-threads.com/admin**
2. Sign in with the email and password Neal gave you.
3. You'll land on a dashboard showing the collections in the left sidebar.

**Changing your password:** click your email in the top-right corner → Account → Change Password. Pick something you'll remember; Neal can't see it.

---

## What you'll see in the sidebar

The collections you'll use most:

- **Products** — every item you sell
- **Categories** — groupings like "Cardigans" or "Scarves" that products belong to
- **Pages** — the About, FAQ, and other content pages on the website
- **Media** — every uploaded photo (managed automatically when you upload to a product)
- **Orders** — every purchase customers have made
- **Homepage Hero** — the big image + headline at the top of the home page

Collections you probably won't need:

- **Product Variants** — the size/color/SKU stock rows behind products. Until the Inventory Workspace is built, Neal/Jarvis will handle bulk setup and corrections.
- **Customers** — people who've made accounts on the site. View-only for support; don't edit.
- **Users** — admin accounts (yours, Neal's, dad's if added). Neal manages this.
- **Gift Cards / Gift Card Redemptions** — Phase 3, not in use yet.

---

## Adding a product

The biggest thing you'll do. Order matters — add the category first so it's there when you create the product.

### 1. Create the category if it doesn't exist

Categories → **+ Create New**

- **Name**: e.g. "Wool Cardigans"
- **Slug**: auto-fills from the name. Don't edit unless you know what you're doing — the slug is what shows up in the URL (`/categories/wool-cardigans`).
- **Description**: a short blurb shown on the category page. One or two sentences.
- **Hero image**: optional, shown at the top of the category page. Drag a photo in or click to upload.
- **Parent**: leave blank unless you want to nest this category under another one (e.g. "Womenswear" → "Cardigans"). Most of ours are flat.

Save.

### 2. Create the product

Products → **+ Create New**

The form has two tabs: **Content** (everything you'll fill in) and **SEO** (search engine fields — optional, fill in only if you want).

On the Content tab:

- **Name**: the product name, e.g. "Crimson Wool Cardigan"
- **Slug**: auto-fills from the name. Leave alone.
- **Description**: rich text editor. Two or three sentences about the piece — material, how it's made, who made it, fit. This is what customers read on the product page.
- **Category**: pick from the dropdown. (If the category isn't there, go back to step 1.)
- **Price (USD)**: enter the dollar amount, e.g. `145`. The system stores it as integer cents (`14500`) behind the scenes — you don't need to think about that.
- **Inventory**: the count for a product with no size/color variants. Leave it blank only if inventory is intentionally not tracked. If the product has variants, the stock count belongs on each variant instead.
- **Photos**: drag in multiple photos. Re-order by dragging. **The first photo is the main one** — it's what shows on the product card in the shop and on the cart. The rest show up in the gallery on the product page (customers swipe between them).
- **Show on homepage**: check this if you want this product featured on the homepage.
- **Status**: most important field.
  - **Draft** = product is hidden from the storefront. Use this while you're still editing. **New products default to Draft so nothing accidentally goes live.**
  - **Published** = product is visible at `/shop`, `/categories/...`, and `/products/...`.
  - **Archived** = product was published, now isn't. Use this for sold-out one-offs or seasonal items you may bring back.

On the SEO tab (optional):

- **SEO Title** — override the browser tab title for this product. If blank, the product name is used.
- **SEO Description** — the blurb that shows in Google search results. If blank, the description is used.
- **SEO Image** — a specific image for when this product is shared on social media. If blank, the first product photo is used.

Save. If status is Published, the product is live on the site immediately.

---

## Updating the homepage

Homepage Hero (sidebar) — this is the big image + headline at the top of the home page.

Every field is optional. Leave one blank and the site uses a default.

- **Eyebrow**: the small uppercased line above the headline (e.g. "New collection"). Leave blank to hide.
- **Headline**: the main big headline. Keep it short — one sentence works best.
- **Body**: one or two sentences under the headline.
- **Background image**: the photo behind the text. Landscape orientation works best (wider than tall). Drag in or upload.
- **Button text**: the call-to-action button (e.g. "Shop the collection"). Leave blank to hide the button.
- **Button link**: where the button takes you. Defaults to `/shop` if blank.

Save. Changes show up on the home page on the next page load.

---

## Marking an order as shipped

Orders → click the order → fill in shipping info → save. The customer gets an email automatically.

Detail:

1. Open the order in Orders.
2. Scroll to **Fulfillment Status**. Change from "Unfulfilled" → **"Shipped"**.
3. Scroll to the **Tracking** tab. Fill in:
   - **Tracking Number**: the carrier's number, e.g. `9400111202555555555555`
   - **Carrier**: type the carrier name — `USPS`, `UPS`, `FedEx`, or `DHL`. If you spell it right (one of those four), the email will include a clickable tracking link. Anything else gets the number as plain text.
4. Save.

The customer gets an email titled "Your order is on its way" with the tracking link within a few seconds.

**Re-saving the order later** (e.g. fixing a typo in the tracking number) does **not** send a second email. Only the first transition from "Unfulfilled" → "Shipped" triggers the email.

Other fulfillment statuses (Processing, Delivered, Cancelled) currently don't trigger emails. They're informational only for now.

---

## Editing the About page (or FAQ, sustainability, etc.)

Pages — manages content pages like /about, /faq, /sustainability.

Pages are structured as **blocks** — you add as many as you want, in whatever order. There are two block types:

- **Rich text** — paragraphs, headings, lists, bold/italic, links. Use this for most copy.
- **Image** — a single image with an optional caption and alignment.

### Creating or editing a page

Pages → **+ Create New** (or click an existing page to edit)

- **Title**: the page heading, e.g. "Our Story"
- **Slug**: auto-fills. The page lives at `/<slug>` — so a slug of "about" makes the page live at `/about`.
- **Blocks**: click "Add Block" → pick "Rich text" or "Image" → fill it in. Drag blocks to re-order.

Save. Pages go live immediately — no draft/published toggle.

### Important about page slugs

If you create a page with slug "shop" or "cart" or "categories", **it won't show up** at those URLs — those are reserved for the storefront's built-in pages. Stick to descriptive slugs like "about", "sustainability", "press", "faq".

---

## Uploading and reusing photos

When you click an upload field (Photos, Hero image, etc.), you can:

- **Drag a file in from your computer** (Mac Finder / Windows Explorer / Photos app), or
- **Click to browse**, or
- **Pick from media you've already uploaded** — click "Select existing" and search by filename.

Photos go to our cloud storage (Cloudflare R2) and are reused everywhere. If you upload the same photo to two products, behind the scenes it's the same file — saves disk space and bandwidth.

**Recommended photo size**: anything iPhone-original is fine. The site automatically generates smaller versions for thumbnails, product cards, etc.

---

## Things to leave alone

Some fields are set by the system or by Stripe — editing them by hand can confuse things. The admin marks them as "read-only" but they sometimes look editable.

- **Order > Status** — set by Stripe when a payment succeeds, fails, or is refunded. Don't change manually.
- **Order > Customer relationship and Guest email** — set when the order is placed. Don't edit.
- **Order > Stripe Payment Intent ID** — for Stripe-side reconciliation. Don't change.
- **Order > Subtotal, Tax, Shipping, Total** — calculated from the line items. Don't edit unless you really know what you're doing.
- **Customer > Stripe Customer ID** — set automatically. Read-only.
- **Product > Slug** — auto-fills from the name. Changing it breaks any links to the product that have been shared.

If you accidentally edit one of these and aren't sure how to undo it — close the tab without saving. If you already saved, text Neal.

---

## Common gotchas

**A product I created isn't showing up on the website.**
Check its Status. Most likely it's still "Draft". Change to "Published" and save.

**The category I want isn't in the dropdown when I'm creating a product.**
Categories load when you open the page — refresh or reopen the product form. If still missing, the category itself wasn't created yet. Go create it first.

**I uploaded a photo but it looks broken on the website.**
Most often this means the photo URL change is taking a moment to propagate. Reload the page once or twice. If it's still broken after a couple minutes, text Neal — there's a separate domain configuration thing that occasionally needs attention.

**I changed the headline on the homepage but it's not showing up.**
The homepage re-fetches on every page load. Force a hard refresh: hold Shift while clicking the browser reload button (Mac: Cmd+Shift+R, Windows: Ctrl+Shift+R).

**I tried to delete an order — it won't let me.**
Orders are protected — they're financial records and shouldn't be deleted. To "remove" an order: change Status to "Refunded" (if it was actually refunded in Stripe) or Fulfillment Status to "Cancelled" (if it was cancelled before shipping). Both keep the record but mark it appropriately.

---

## When something looks really broken

If the site is down, the admin won't load, or you see an error message that looks scary — don't panic, and text Neal. Most issues are either (a) a momentary blip that fixes itself in a minute, or (b) something Neal can fix in a few minutes from his computer.

Don't try to fix code things yourself — there's no admin button for that, and any "fix" usually means logging into Vercel or Stripe, which Neal handles.

For content-level issues (a wrong price, a typo, a wrong photo), you can fix those directly. For anything that looks like a system error — text Neal.

---

Welcome to the admin. The shop is yours to run.

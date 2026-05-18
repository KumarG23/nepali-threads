# Product Migration Reference

> Working doc for re-entering products into the new Payload admin. Sourced live from the old Django backend at `nep-back.fly.dev` on 2026-05-18.
>
> Found **15 products** across **4 categories** (you mentioned 16 — the live API returns 15; flagging in case one's hidden or you were rounding).
>
> For each product image:
> - **Live URL** = direct download from the old backend (1–2 MB `.webp` each)
> - **Local match** = filename in `public/migrated-product-images/` if it overlaps with what we synced from the old `media/` folder
> - **Facetune timestamp** = the date/time the Facetune edit was saved, which is also roughly when the photo appears in iCloud — use this to find the original
>
> Many live images are `.webp` re-renders that don't exist in the local migration folder; for those you'll want to either download from the live URL or find the original in iCloud by the timestamp.
>
> **Source photo library:** `~/code/nepali-threads-assets/store-photos/` (outside this repo) holds **258 iPhone originals** named `IMG_0025.JPG` through `IMG_0283.JPG` (~2.1 GB total). This appears to be the full unedited shoot the Facetune-edited product images were derived from. It lives outside the repo so it's never committed or shipped, but is on the same machine for local reference when picking the best shot per product. iPhone `IMG_xxxx` numbers are roughly chronological, so a Facetune timestamp of `Jun 11, 2024 at 18:51:27` should correspond to an IMG within a few numbers of the photos taken around that time — check the EXIF dates if you want exact matches.

---

## Product 1 — Romper #1

- **Price:** $35.00 USD
- **Category:** Romper
- **Description:** Universal romper to fit all sizes with silk belt
- **Old DB id:** `7`  ·  Created 2024-06-21

### Images (3 total)

1. **Main image** — `Facetune_11-06-2024-18-51-27_eKHyUlh.webp`
   - Live URL: https://nep-back.fly.dev/media/product_images/Facetune_11-06-2024-18-51-27_eKHyUlh.webp
   - Local match: `public/migrated-product-images/Facetune_11-06-2024-18-51-27.jpeg`
   - Facetune saved: **Jun 11, 2024 at 18:51:27** (search iCloud Photos around this time)
2. **Gallery image 1** — `Facetune_11-06-2024-18-51-06_vsT8a9d.webp`
   - Live URL: https://nep-back.fly.dev/media/product_images/Facetune_11-06-2024-18-51-06_vsT8a9d.webp
   - Local match: `public/migrated-product-images/Facetune_11-06-2024-18-51-06.jpeg`
   - Facetune saved: **Jun 11, 2024 at 18:51:06** (search iCloud Photos around this time)
3. **Gallery image 2** — `Facetune_11-06-2024-18-55-09_gtQTxu6.jpeg`
   - Live URL: https://nep-back.fly.dev/media/product_images/Facetune_11-06-2024-18-55-09_gtQTxu6.jpeg
   - Local match: `public/migrated-product-images/Facetune_11-06-2024-18-55-09.jpeg`
   - Facetune saved: **Jun 11, 2024 at 18:55:09** (search iCloud Photos around this time)

---

## Product 2 — Loose Pants #1

- **Price:** $25.00 USD
- **Category:** Bottoms
- **Description:** Comfortable Loose Pants. 100% cotton. Large Pockets.
- **Old DB id:** `8`  ·  Created 2024-06-21

### Images (3 total)

1. **Main image** — `Facetune_11-06-2024-19-05-12_1.webp`
   - Live URL: https://nep-back.fly.dev/media/product_images/Facetune_11-06-2024-19-05-12_1.webp
   - Local match: *(not in migration folder — fetch from live URL or iCloud)*
   - Facetune saved: **Jun 11, 2024 at 19:05:12** (search iCloud Photos around this time)
2. **Gallery image 1** — `Facetune_11-06-2024-19-01-15.webp`
   - Live URL: https://nep-back.fly.dev/media/product_images/Facetune_11-06-2024-19-01-15.webp
   - Local match: `public/migrated-product-images/Facetune_11-06-2024-19-01-15.jpeg`
   - Facetune saved: **Jun 11, 2024 at 19:01:15** (search iCloud Photos around this time)
3. **Gallery image 2** — `Facetune_11-06-2024-19-03-13.webp`
   - Live URL: https://nep-back.fly.dev/media/product_images/Facetune_11-06-2024-19-03-13.webp
   - Local match: `public/migrated-product-images/Facetune_11-06-2024-19-03-13.jpeg`
   - Facetune saved: **Jun 11, 2024 at 19:03:13** (search iCloud Photos around this time)

---

## Product 3 — Romper #2

- **Price:** $35.00 USD
- **Category:** Romper
- **Description:** Universal romper to fit all sizes with silk belt
- **Old DB id:** `9`  ·  Created 2024-06-21

### Images (3 total)

1. **Main image** — `Facetune_11-06-2024-18-50-44.webp`
   - Live URL: https://nep-back.fly.dev/media/product_images/Facetune_11-06-2024-18-50-44.webp
   - Local match: `public/migrated-product-images/Facetune_11-06-2024-18-50-44.jpeg`
   - Facetune saved: **Jun 11, 2024 at 18:50:44** (search iCloud Photos around this time)
2. **Gallery image 1** — `Facetune_11-06-2024-18-53-20.webp`
   - Live URL: https://nep-back.fly.dev/media/product_images/Facetune_11-06-2024-18-53-20.webp
   - Local match: `public/migrated-product-images/Facetune_11-06-2024-18-53-20.jpeg`
   - Facetune saved: **Jun 11, 2024 at 18:53:20** (search iCloud Photos around this time)
3. **Gallery image 2** — `Facetune_11-06-2024-18-54-07.webp`
   - Live URL: https://nep-back.fly.dev/media/product_images/Facetune_11-06-2024-18-54-07.webp
   - Local match: *(not in migration folder — fetch from live URL or iCloud)*
   - Facetune saved: **Jun 11, 2024 at 18:54:07** (search iCloud Photos around this time)

---

## Product 4 — Loose Pants #2

- **Price:** $25.00 USD
- **Category:** Bottoms
- **Description:** Comfortable Loose Pants. 100% cotton. Large Pockets
- **Old DB id:** `10`  ·  Created 2024-06-21

### Images (3 total)

1. **Main image** — `Facetune_11-06-2024-20-12-52.webp`
   - Live URL: https://nep-back.fly.dev/media/product_images/Facetune_11-06-2024-20-12-52.webp
   - Local match: `public/migrated-product-images/Facetune_11-06-2024-20-12-52.jpeg`
   - Facetune saved: **Jun 11, 2024 at 20:12:52** (search iCloud Photos around this time)
2. **Gallery image 1** — `Facetune_11-06-2024-20-15-32.webp`
   - Live URL: https://nep-back.fly.dev/media/product_images/Facetune_11-06-2024-20-15-32.webp
   - Local match: `public/migrated-product-images/Facetune_11-06-2024-20-15-32.jpeg`
   - Facetune saved: **Jun 11, 2024 at 20:15:32** (search iCloud Photos around this time)
3. **Gallery image 2** — `Facetune_11-06-2024-20-19-03.webp`
   - Live URL: https://nep-back.fly.dev/media/product_images/Facetune_11-06-2024-20-19-03.webp
   - Local match: *(not in migration folder — fetch from live URL or iCloud)*
   - Facetune saved: **Jun 11, 2024 at 20:19:03** (search iCloud Photos around this time)

---

## Product 5 — Silk Dress #1

- **Price:** $30.00 USD
- **Category:** Dresses
- **Description:** Dress that looks like a romper. High quality silk
- **Old DB id:** `11`  ·  Created 2024-06-21

### Images (3 total)

1. **Main image** — `Facetune_11-06-2024-19-20-54.webp`
   - Live URL: https://nep-back.fly.dev/media/product_images/Facetune_11-06-2024-19-20-54.webp
   - Local match: `public/migrated-product-images/Facetune_11-06-2024-19-20-54.jpeg`
   - Facetune saved: **Jun 11, 2024 at 19:20:54** (search iCloud Photos around this time)
2. **Gallery image 1** — `Facetune_11-06-2024-19-22-57.webp`
   - Live URL: https://nep-back.fly.dev/media/product_images/Facetune_11-06-2024-19-22-57.webp
   - Local match: `public/migrated-product-images/Facetune_11-06-2024-19-22-57.jpeg`
   - Facetune saved: **Jun 11, 2024 at 19:22:57** (search iCloud Photos around this time)
3. **Gallery image 2** — `Facetune_11-06-2024-20-23-44.webp`
   - Live URL: https://nep-back.fly.dev/media/product_images/Facetune_11-06-2024-20-23-44.webp
   - Local match: *(not in migration folder — fetch from live URL or iCloud)*
   - Facetune saved: **Jun 11, 2024 at 20:23:44** (search iCloud Photos around this time)

---

## Product 6 — Patch Work Long Sleeve

- **Price:** $30.00 USD
- **Category:** Tops
- **Description:** High quality Patch work. Unique design. 100% Cotton
- **Old DB id:** `12`  ·  Created 2024-06-21

### Images (3 total)

1. **Main image** — `Facetune_11-06-2024-20-04-52.webp`
   - Live URL: https://nep-back.fly.dev/media/product_images/Facetune_11-06-2024-20-04-52.webp
   - Local match: `public/migrated-product-images/Facetune_11-06-2024-20-04-52.jpeg`
   - Facetune saved: **Jun 11, 2024 at 20:04:52** (search iCloud Photos around this time)
2. **Gallery image 1** — `Facetune_11-06-2024-20-07-48.webp`
   - Live URL: https://nep-back.fly.dev/media/product_images/Facetune_11-06-2024-20-07-48.webp
   - Local match: `public/migrated-product-images/Facetune_11-06-2024-20-07-48.jpeg`
   - Facetune saved: **Jun 11, 2024 at 20:07:48** (search iCloud Photos around this time)
3. **Gallery image 2** — `Facetune_11-06-2024-20-10-20.webp`
   - Live URL: https://nep-back.fly.dev/media/product_images/Facetune_11-06-2024-20-10-20.webp
   - Local match: `public/migrated-product-images/Facetune_11-06-2024-20-10-20.jpeg`
   - Facetune saved: **Jun 11, 2024 at 20:10:20** (search iCloud Photos around this time)

---

## Product 7 — Silk Dress #2

- **Price:** $35.00 USD
- **Category:** Dresses
- **Description:** High quality silk dress. One size fits all
- **Old DB id:** `13`  ·  Created 2024-06-21

### Images (3 total)

1. **Main image** — `Facetune_11-06-2024-19-18-04.webp`
   - Live URL: https://nep-back.fly.dev/media/product_images/Facetune_11-06-2024-19-18-04.webp
   - Local match: *(not in migration folder — fetch from live URL or iCloud)*
   - Facetune saved: **Jun 11, 2024 at 19:18:04** (search iCloud Photos around this time)
2. **Gallery image 1** — `Facetune_11-06-2024-19-08-54.webp`
   - Live URL: https://nep-back.fly.dev/media/product_images/Facetune_11-06-2024-19-08-54.webp
   - Local match: *(not in migration folder — fetch from live URL or iCloud)*
   - Facetune saved: **Jun 11, 2024 at 19:08:54** (search iCloud Photos around this time)
3. **Gallery image 2** — `Facetune_11-06-2024-19-13-19.webp`
   - Live URL: https://nep-back.fly.dev/media/product_images/Facetune_11-06-2024-19-13-19.webp
   - Local match: *(not in migration folder — fetch from live URL or iCloud)*
   - Facetune saved: **Jun 11, 2024 at 19:13:19** (search iCloud Photos around this time)

---

## Product 8 — Nepali Kimono

- **Price:** $35.00 USD
- **Category:** Dresses
- **Description:** Silk Nepali style kimono
- **Old DB id:** `14`  ·  Created 2024-06-21

### Images (3 total)

1. **Main image** — `Facetune_11-06-2024-20-24-41.webp`
   - Live URL: https://nep-back.fly.dev/media/product_images/Facetune_11-06-2024-20-24-41.webp
   - Local match: *(not in migration folder — fetch from live URL or iCloud)*
   - Facetune saved: **Jun 11, 2024 at 20:24:41** (search iCloud Photos around this time)
2. **Gallery image 1** — `Facetune_11-06-2024-20-07-59.webp`
   - Live URL: https://nep-back.fly.dev/media/product_images/Facetune_11-06-2024-20-07-59.webp
   - Local match: *(not in migration folder — fetch from live URL or iCloud)*
   - Facetune saved: **Jun 11, 2024 at 20:07:59** (search iCloud Photos around this time)
3. **Gallery image 2** — `Facetune_11-06-2024-20-27-11.webp`
   - Live URL: https://nep-back.fly.dev/media/product_images/Facetune_11-06-2024-20-27-11.webp
   - Local match: *(not in migration folder — fetch from live URL or iCloud)*
   - Facetune saved: **Jun 11, 2024 at 20:27:11** (search iCloud Photos around this time)

---

## Product 9 — Board Shorts

- **Price:** $25.00 USD
- **Category:** Bottoms
- **Description:** Comfortable 100% cotton shorts
- **Old DB id:** `15`  ·  Created 2024-06-21

### Images (3 total)

1. **Main image** — `Facetune_11-06-2024-19-29-16.webp`
   - Live URL: https://nep-back.fly.dev/media/product_images/Facetune_11-06-2024-19-29-16.webp
   - Local match: *(not in migration folder — fetch from live URL or iCloud)*
   - Facetune saved: **Jun 11, 2024 at 19:29:16** (search iCloud Photos around this time)
2. **Gallery image 1** — `Facetune_11-06-2024-19-38-37.webp`
   - Live URL: https://nep-back.fly.dev/media/product_images/Facetune_11-06-2024-19-38-37.webp
   - Local match: *(not in migration folder — fetch from live URL or iCloud)*
   - Facetune saved: **Jun 11, 2024 at 19:38:37** (search iCloud Photos around this time)
3. **Gallery image 2** — `Facetune_11-06-2024-19-39-24.webp`
   - Live URL: https://nep-back.fly.dev/media/product_images/Facetune_11-06-2024-19-39-24.webp
   - Local match: *(not in migration folder — fetch from live URL or iCloud)*
   - Facetune saved: **Jun 11, 2024 at 19:39:24** (search iCloud Photos around this time)

---

## Product 10 — Loose Pants #3

- **Price:** $30.00 USD
- **Category:** Bottoms
- **Description:** Comfortable loose pants with unique design
- **Old DB id:** `16`  ·  Created 2024-06-21

### Images (2 total)

1. **Main image** — `Facetune_11-06-2024-19-49-51.webp`
   - Live URL: https://nep-back.fly.dev/media/product_images/Facetune_11-06-2024-19-49-51.webp
   - Local match: *(not in migration folder — fetch from live URL or iCloud)*
   - Facetune saved: **Jun 11, 2024 at 19:49:51** (search iCloud Photos around this time)
2. **Gallery image 1** — `Facetune_11-06-2024-19-51-09.webp`
   - Live URL: https://nep-back.fly.dev/media/product_images/Facetune_11-06-2024-19-51-09.webp
   - Local match: *(not in migration folder — fetch from live URL or iCloud)*
   - Facetune saved: **Jun 11, 2024 at 19:51:09** (search iCloud Photos around this time)

---

## Product 11 — Silk Dress #3

- **Price:** $35.00 USD
- **Category:** Dresses
- **Description:** 100% silk dress
- **Old DB id:** `17`  ·  Created 2024-06-21

### Images (3 total)

1. **Main image** — `Facetune_11-06-2024-22-43-28.webp`
   - Live URL: https://nep-back.fly.dev/media/product_images/Facetune_11-06-2024-22-43-28.webp
   - Local match: *(not in migration folder — fetch from live URL or iCloud)*
   - Facetune saved: **Jun 11, 2024 at 22:43:28** (search iCloud Photos around this time)
2. **Gallery image 1** — `Facetune_11-06-2024-22-52-00.webp`
   - Live URL: https://nep-back.fly.dev/media/product_images/Facetune_11-06-2024-22-52-00.webp
   - Local match: *(not in migration folder — fetch from live URL or iCloud)*
   - Facetune saved: **Jun 11, 2024 at 22:52:00** (search iCloud Photos around this time)
3. **Gallery image 2** — `Facetune_11-06-2024-22-53-16.webp`
   - Live URL: https://nep-back.fly.dev/media/product_images/Facetune_11-06-2024-22-53-16.webp
   - Local match: *(not in migration folder — fetch from live URL or iCloud)*
   - Facetune saved: **Jun 11, 2024 at 22:53:16** (search iCloud Photos around this time)

---

## Product 12 — Dress #1

- **Price:** $30.00 USD
- **Category:** Dresses
- **Description:** Comfortable silk dress. One size fits all. Where it how you like it
- **Old DB id:** `18`  ·  Created 2024-06-21

### Images (2 total)

1. **Main image** — `Facetune_11-06-2024-20-48-16.webp`
   - Live URL: https://nep-back.fly.dev/media/product_images/Facetune_11-06-2024-20-48-16.webp
   - Local match: *(not in migration folder — fetch from live URL or iCloud)*
   - Facetune saved: **Jun 11, 2024 at 20:48:16** (search iCloud Photos around this time)
2. **Gallery image 1** — `Facetune_11-06-2024-21-19-17.webp`
   - Live URL: https://nep-back.fly.dev/media/product_images/Facetune_11-06-2024-21-19-17.webp
   - Local match: *(not in migration folder — fetch from live URL or iCloud)*
   - Facetune saved: **Jun 11, 2024 at 21:19:17** (search iCloud Photos around this time)

---

## Product 13 — Loose Pants #4

- **Price:** $30.00 USD
- **Category:** Bottoms
- **Description:** Comfortable loose pants. 100% cotton
- **Old DB id:** `19`  ·  Created 2024-06-21

### Images (2 total)

1. **Main image** — `Facetune_11-06-2024-22-26-54.webp`
   - Live URL: https://nep-back.fly.dev/media/product_images/Facetune_11-06-2024-22-26-54.webp
   - Local match: *(not in migration folder — fetch from live URL or iCloud)*
   - Facetune saved: **Jun 11, 2024 at 22:26:54** (search iCloud Photos around this time)
2. **Gallery image 1** — `Facetune_11-06-2024-22-33-45.webp`
   - Live URL: https://nep-back.fly.dev/media/product_images/Facetune_11-06-2024-22-33-45.webp
   - Local match: *(not in migration folder — fetch from live URL or iCloud)*
   - Facetune saved: **Jun 11, 2024 at 22:33:45** (search iCloud Photos around this time)

---

## Product 14 — Loose Pants #5

- **Price:** $30.00 USD
- **Category:** Bottoms
- **Description:** Comfortable pants. 100% cotton
- **Old DB id:** `20`  ·  Created 2024-06-21

### Images (2 total)

1. **Main image** — `Facetune_12-06-2024-15-02-09.webp`
   - Live URL: https://nep-back.fly.dev/media/product_images/Facetune_12-06-2024-15-02-09.webp
   - Local match: *(not in migration folder — fetch from live URL or iCloud)*
   - Facetune saved: **Jun 12, 2024 at 15:02:09** (search iCloud Photos around this time)
2. **Gallery image 1** — `Facetune_12-06-2024-15-55-13.webp`
   - Live URL: https://nep-back.fly.dev/media/product_images/Facetune_12-06-2024-15-55-13.webp
   - Local match: *(not in migration folder — fetch from live URL or iCloud)*
   - Facetune saved: **Jun 12, 2024 at 15:55:13** (search iCloud Photos around this time)

---

## Product 15 — Dress #2

- **Price:** $35.00 USD
- **Category:** Dresses
- **Description:** Comfortable Dress
- **Old DB id:** `21`  ·  Created 2024-06-21

### Images (2 total)

1. **Main image** — `Facetune_12-06-2024-17-45-37.webp`
   - Live URL: https://nep-back.fly.dev/media/product_images/Facetune_12-06-2024-17-45-37.webp
   - Local match: *(not in migration folder — fetch from live URL or iCloud)*
   - Facetune saved: **Jun 12, 2024 at 17:45:37** (search iCloud Photos around this time)
2. **Gallery image 1** — `Facetune_12-06-2024-17-49-33.webp`
   - Live URL: https://nep-back.fly.dev/media/product_images/Facetune_12-06-2024-17-49-33.webp
   - Local match: *(not in migration folder — fetch from live URL or iCloud)*
   - Facetune saved: **Jun 12, 2024 at 17:49:33** (search iCloud Photos around this time)

---

## Appendix — Migrated files not referenced by the live site

These exist in `public/migrated-product-images/` but no live product references them. They're older `.jpeg` versions of photos the live site has since replaced with `.webp`, or photos that were uploaded then later removed. Sample matching by timestamp is still useful — search iCloud by the date in the filename.

- `Facetune_11-06-2024-19-05-12.jpeg` — Facetune saved Jun 11, 2024 at 19:05:12
- `Facetune_11-06-2024-19-07-20.jpeg` — Facetune saved Jun 11, 2024 at 19:07:20
- `Facetune_11-06-2024-19-16-28.jpeg` — Facetune saved Jun 11, 2024 at 19:16:28
- `IMG_0030.JPG` — also present in the source photo library at `~/code/nepali-threads-assets/store-photos/`
- `kumar-profile.png` — appears to be a profile portrait, not a product photo

*(The source photo library lives outside this repo — see the header section.)*

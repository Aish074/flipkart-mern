
# Flipkart MERN: Personalized Ad Engine

A MERN e-commerce app extended with a **simplified ad-serving engine**. It tracks what shoppers do, builds an interest profile, and shows ranked sponsored products. Admins create campaigns and see impressions, clicks, CTR and spend.

> Learning project. Not affiliated with, or endorsed by, Flipkart.

## Credits

Fork of [jigar-sable/flipkart-mern](https://github.com/jigar-sable/flipkart-mern) by Jigar Sable (MIT license). The storefront (auth, products, cart, orders, reviews, admin panel, payments) comes from that project. Everything under **What I added** is my own work.

## What I added

| Feature | Summary |
|---|---|
| **Ad engine** | Event tracking, interest profile, campaign targeting, ranking, impression/click logging, daily budget, CTR dashboard |
| **Stock race-condition fix** | Atomic stock reservation at order time, so the last item can't be sold twice |
| **Bug fixes** | Logout crash on a `null` user, product page crash when a product fails to load, missing `nodemon` dev dependency |

<!-- Add 2-3 screenshots here: a sponsored ad with its reason, and the Admin > Campaigns table.
     Save them in docs/ and link them like: ![Sponsored ad](docs/ad-example.png) -->

## How the ad engine works (short version)

1. The React app sends shopper events (views, clicks, add to cart, searches) to the API.
2. For each ad request, the server builds an **interest profile** from recent events, with newer events counting more.
3. It filters **eligible campaigns** (active, in stock, matching targeting and price band, within budget).
4. It ranks them by **relevance x bid**, with a penalty for ads already shown, and returns the best few with a reason such as "Because you've been browsing laptops".
5. Impressions and clicks are logged and shown as CTR and spend in the admin dashboard.

Full details, the API, and the stock-fix write-up: **[docs/technical-notes.md](docs/technical-notes.md)**

## Tech stack

React 17, Redux, Tailwind CSS, MUI | Node.js, Express | MongoDB (Mongoose) | JWT auth | Cloudinary

## Quick start

```bash
git clone https://github.com/YOUR-USERNAME/flipkart-mern.git
cd flipkart-mern
npm install
npm install --prefix frontend
cp backend/config/config.env.example backend/config/config.env
npm run dev     # backend :4000, frontend :3000
```

In `backend/config/config.env`, set at least `MONGO_URI` (the code reads `MONGO_URI`, although the example file says `MONGO_URL`), `JWT_SECRET`, and the three `CLOUDINARY_*` values. To get an admin, sign up, then set that user's `role` to `admin` in MongoDB. More setup notes are in the technical notes.

## Known limitations

- Events come from the browser, so click fraud isn't prevented.
- Ads are shown on the product page only.
- No automated tests yet.

More in the technical notes.

## License

MIT. Copyright (c) 2022 Jigar Sable (original project). Copyright (c) 2026 Your Name (additions). See [LICENSE](LICENSE).

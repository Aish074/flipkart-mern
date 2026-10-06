const Event = require('../models/eventModel');
const Product = require('../models/productModel');
const affinity = require('../config/affinity.json');

const WINDOW_DAYS = 7;        // only look at the last week
const MAX_EVENTS = 50;        // and at most 50 events
const HALF_LIFE_HOURS = 24;   // an event's weight halves every day
const CONTEXT_WEIGHT = 3;     // the product on screen right now counts the most

// how much each kind of action says about interest
const EVENT_WEIGHTS = {
    product_view: 1,
    product_click: 2,
    add_to_cart: 5,
    search: 1,
    category_visit: 1.5,
    ad_click: 3,
};

const decay = (createdAt) => {
    const hours = (Date.now() - new Date(createdAt).getTime()) / 36e5;
    return Math.pow(0.5, hours / HALF_LIFE_HOURS);
};

const add = (map, key, value) => {
    if (!key) return;
    map[key] = (map[key] || 0) + value;
};

// scale every score to 0..1 (the biggest becomes 1)
const normalise = (map) => {
    const max = Math.max(0, ...Object.values(map));
    if (!max) return {};
    const out = {};
    for (const [k, v] of Object.entries(map)) out[k] = v / max;
    return out;
};

// "laptop" interest also gives some "mouse" interest, using the affinity map
const expand = (map, related) => {
    const out = { ...map };
    for (const [key, score] of Object.entries(map)) {
        const links = related[key] || {};
        for (const [other, weight] of Object.entries(links)) {
            out[other] = Math.max(out[other] || 0, score * weight);
        }
    }
    return out;
};

async function buildProfile(sessionId, contextProduct) {

    const since = new Date(Date.now() - WINDOW_DAYS * 24 * 3600 * 1000);
    const events = await Event.find({ sessionId, createdAt: { $gte: since } })
        .sort({ createdAt: -1 })
        .limit(MAX_EVENTS)
        .lean();

    // one extra query to get the tags and subcategory of the products involved
    const ids = [...new Set(events.filter((e) => e.product).map((e) => String(e.product)))];
    const products = await Product.find({ _id: { $in: ids } })
        .select('category subcategory tags price')
        .lean();
    const byId = {};
    products.forEach((p) => { byId[String(p._id)] = p; });

    const raw = { categories: {}, subcategories: {}, tags: {} };
    const seenTypes = new Set();
    const impressions = {};          // campaignId -> times shown in the last 24h
    let priceSum = 0;
    let priceWeight = 0;

    const addProduct = (p, w) => {
        add(raw.categories, (p.category || '').toLowerCase(), w);
        add(raw.subcategories, p.subcategory, w);
        (p.tags || []).forEach((t) => add(raw.tags, t, w));
        if (typeof p.price === 'number') {
            priceSum += p.price * w;
            priceWeight += w;
        }
    };

    for (const e of events) {
        seenTypes.add(e.type);

        if (e.type === 'ad_impression' && e.campaign && Date.now() - new Date(e.createdAt).getTime() < 24 * 3600 * 1000) {
            const id = String(e.campaign);
            impressions[id] = (impressions[id] || 0) + 1;
        }

        const w = (EVENT_WEIGHTS[e.type] || 0) * decay(e.createdAt);
        if (!w) continue;

        const product = e.product && byId[String(e.product)];
        if (product) addProduct(product, w);
        else if (e.category) add(raw.categories, e.category.toLowerCase(), w);

        // search words count as tag interest
        if (e.type === 'search' && e.keyword) {
            e.keyword.split(/\s+/).filter(Boolean).forEach((k) => add(raw.tags, k, w));
        }
    }

    if (contextProduct) addProduct(contextProduct, CONTEXT_WEIGHT);

    return {
        categories: expand(normalise(raw.categories), affinity.categories),
        subcategories: normalise(raw.subcategories),
        tags: expand(normalise(raw.tags), affinity.tags),
        avgPrice: priceWeight ? priceSum / priceWeight : null,
        seenTypes,
        impressions,
    };
}

module.exports = { buildProfile };
const Campaign = require('../models/campaignModel');
const { buildProfile } = require('./interestProfile');
const Event = require('../models/eventModel');

const MIN_RELEVANCE = 0.2;   // weaker matches are not shown

// which parts of a campaign's targeting count, and how much
const DIMENSIONS = [
    { field: 'categories', weight: 0.4, label: (k) => `you've been browsing ${k}` },
    { field: 'subcategories', weight: 0.3, label: (k) => `you're interested in ${k}` },
    { field: 'tags', weight: 0.3, label: (k) => `you're interested in ${k}` },
];

// highest interest score among a campaign's targets
const best = (targets, scores) => {
    let top = { score: 0, key: null };
    for (const t of targets) {
        const s = scores[t] || 0;
        if (s > top.score) top = { score: s, key: t };
    }
    return top;
};

async function selectAds({ sessionId, placement, contextProduct, limit = 3 }) {

    const profile = await buildProfile(sessionId, contextProduct);

    const campaigns = await Campaign.find({ status: 'active', placements: placement })
        .populate('product', 'name price cuttedPrice images stock ratings numOfReviews brand.name')
        .lean();
    
     // clicks per campaign since midnight, to work out today's spend
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const clickRows = await Event.aggregate([
           { $match: { type: 'ad_click', createdAt: { $gte: startOfDay }, campaign: { $in: campaigns.map((c) => c._id) } } },
           { $group: { _id: '$campaign', clicks: { $sum: 1 } } },
    ]);
    const clicksToday = {};
    clickRows.forEach((r) => { clicksToday[String(r._id)] = r.clicks; });

    const ranked = [];

    for (const c of campaigns) {
        const promoted = c.product;
        const t = c.targeting;

        // 1. basic eligibility
        if (!promoted || promoted.stock < 1) continue;
        if (contextProduct && String(promoted._id) === String(contextProduct._id)) continue;
        if (c.dailyBudget > 0 && (clicksToday[String(c._id)] || 0) * c.bid >= c.dailyBudget) continue;

        // 2. the shopper must have done the target event
        if (t.triggerEvents.length) {
            const triggered = t.triggerEvents.some(
                (ev) => profile.seenTypes.has(ev) || (ev === 'product_view' && contextProduct)
            );
            if (!triggered) continue;
        }

        // 3. price band of what the shopper is looking at
        const refPrice = contextProduct ? contextProduct.price : profile.avgPrice;
        if (refPrice != null && (refPrice < t.minPrice || refPrice > t.maxPrice)) continue;

        // 4. relevance: how well the shopper's interests match the targeting
        let weightSum = 0;
        let total = 0;
        let top = { score: 0, text: null };

        for (const d of DIMENSIONS) {
            const targets = t[d.field];
            if (!targets.length) continue;
            const b = best(targets, profile[d.field]);
            weightSum += d.weight;
            total += d.weight * b.score;
            if (b.score > top.score) top = { score: b.score, text: d.label(b.key) };
        }

        let relevance;
        if (weightSum === 0) {
            relevance = 0.1;                       // no targeting rules: low base relevance
        } else {
            relevance = total / weightSum;
            if (relevance < MIN_RELEVANCE) continue;
        }

        // 5. show an ad less often the more it has already been shown
        const shown = profile.impressions[String(c._id)] || 0;
        const penalty = 1 / (1 + 0.25 * shown);

        ranked.push({
            c,
            promoted,
            score: relevance * c.bid * penalty,
            reason: top.text ? `Because ${top.text}` : 'Sponsored pick',
        });
    }

    ranked.sort((a, b) => b.score - a.score);

    // one ad per promoted product
    const seen = new Set();
    const unique = [];
    for (const r of ranked) {
        const id = String(r.promoted._id);
        if (seen.has(id)) continue;
        seen.add(id);
        unique.push(r);
    }

    return unique.slice(0, limit).map(({ c, promoted, score, reason }) => ({
        campaignId: c._id,
        headline: c.headline || promoted.name,
        reason,
        score: Number(score.toFixed(3)),
        product: {
            _id: promoted._id,
            name: promoted.name,
            price: promoted.price,
            cuttedPrice: promoted.cuttedPrice,
            image: promoted.images && promoted.images[0] ? promoted.images[0].url : '',
            ratings: promoted.ratings,
            numOfReviews: promoted.numOfReviews,
            brand: promoted.brand ? promoted.brand.name : '',
        },
    }));
}

module.exports = { selectAds };
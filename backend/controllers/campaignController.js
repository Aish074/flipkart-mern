const asyncErrorHandler = require('../middlewares/asyncErrorHandler');
const ErrorHandler = require('../utils/errorHandler');
const Campaign = require('../models/campaignModel');
const Product = require('../models/productModel');
const Event = require('../models/eventModel');

// accepts an array or "a, b, c" text and returns clean lowercase words
const toList = (v) => (Array.isArray(v) ? v : typeof v === 'string' ? v.split(',') : []);
const clean = (v) => toList(v).map((s) => String(s).trim().toLowerCase()).filter(Boolean);

// Create Campaign ---ADMIN
exports.createCampaign = asyncErrorHandler(async (req, res, next) => {

    const { name, product, headline, targeting = {}, placements, bid, dailyBudget } = req.body;

    const promoted = await Product.findById(product);
    if (!promoted) {
        return next(new ErrorHandler("Product Not Found", 404));
    }

    const campaign = await Campaign.create({
        name,
        product: promoted._id,
        headline: headline || promoted.name,
        targeting: {
            categories: clean(targeting.categories),
            subcategories: clean(targeting.subcategories),
            tags: clean(targeting.tags),
            minPrice: Number(targeting.minPrice) || 0,
            maxPrice: Number(targeting.maxPrice) || 1000000000,
            triggerEvents: toList(targeting.triggerEvents),
        },
        placements: toList(placements),
        bid: Number(bid) || 1,
        dailyBudget: Number(dailyBudget) || 0,
        createdBy: req.user._id,
    });

    res.status(201).json({ success: true, campaign });
});

// Get All Campaigns (with performance stats) ---ADMIN
exports.getAllCampaigns = asyncErrorHandler(async (req, res, next) => {

       const campaigns = await Campaign.find()
           .populate('product', 'name price stock')
           .sort({ createdAt: -1 })
           .lean();

       // count impressions and clicks per campaign
       const rows = await Event.aggregate([
           { $match: { type: { $in: ['ad_impression', 'ad_click'] }, campaign: { $ne: null } } },
           { $group: { _id: { campaign: '$campaign', type: '$type' }, count: { $sum: 1 } } },
       ]);

       const counts = {};
       rows.forEach((r) => {
           const id = String(r._id.campaign);
           counts[id] = counts[id] || { impressions: 0, clicks: 0 };
           if (r._id.type === 'ad_impression') counts[id].impressions = r.count;
           else counts[id].clicks = r.count;
       });

       const withStats = campaigns.map((c) => {
           const s = counts[String(c._id)] || { impressions: 0, clicks: 0 };
           return {
               ...c,
               stats: {
                   impressions: s.impressions,
                   clicks: s.clicks,
                   ctr: s.impressions ? Number(((s.clicks / s.impressions) * 100).toFixed(2)) : 0,
                   spend: Number((s.clicks * c.bid).toFixed(2)),
               },
           };
       });

    res.status(200).json({ success: true, campaigns: withStats });
});

// Pause / Activate Campaign ---ADMIN
exports.updateCampaignStatus = asyncErrorHandler(async (req, res, next) => {

    const { status } = req.body;
    if (!['active', 'paused'].includes(status)) {
        return next(new ErrorHandler("Invalid status", 400));
    }

    const campaign = await Campaign.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!campaign) {
        return next(new ErrorHandler("Campaign Not Found", 404));
    }

    res.status(200).json({ success: true, campaign });
});

// Delete Campaign ---ADMIN
exports.deleteCampaign = asyncErrorHandler(async (req, res, next) => {

    const campaign = await Campaign.findByIdAndDelete(req.params.id);
    if (!campaign) {
        return next(new ErrorHandler("Campaign Not Found", 404));
    }

    res.status(200).json({ success: true });
});
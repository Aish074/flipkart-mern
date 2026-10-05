const mongoose = require('mongoose');
const asyncErrorHandler = require('../middlewares/asyncErrorHandler');
const Event = require('../models/eventModel');
const Product = require('../models/productModel');
const { EVENT_TYPES } = require('../models/eventModel');

// Record a user activity event
exports.trackEvent = asyncErrorHandler(async (req, res, next) => {

    const { sessionId, type, productId, keyword, category, campaignId } = req.body;

    if (typeof sessionId !== 'string' || !sessionId || sessionId.length > 64) {
        return res.status(400).json({ success: false, message: 'Invalid sessionId' });
    }
    if (!EVENT_TYPES.includes(type)) {
        return res.status(400).json({ success: false, message: 'Invalid event type' });
    }

    const doc = { sessionId, type };

    if (req.user) doc.user = req.user._id;

    // The server fills in product details, so the browser can't send fake ones
    if (productId && mongoose.isValidObjectId(productId)) {
        const product = await Product.findById(productId).select('category price brand.name');
        if (product) {
            doc.product = product._id;
            doc.category = product.category;
            doc.price = product.price;
            doc.brand = product.brand.name;
        }
    }

    if (typeof keyword === 'string') doc.keyword = keyword.slice(0, 100).toLowerCase();
    if (!doc.category && typeof category === 'string') doc.category = category.slice(0, 50);
    if (campaignId && mongoose.isValidObjectId(campaignId)) doc.campaign = campaignId;

    await Event.create(doc);

    res.status(201).json({ success: true });
});
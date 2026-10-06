const mongoose = require('mongoose');
const asyncErrorHandler = require('../middlewares/asyncErrorHandler');
const Product = require('../models/productModel');
const { PLACEMENTS } = require('../models/campaignModel');
const { selectAds } = require('../utils/adEngine');

exports.getAds = asyncErrorHandler(async (req, res, next) => {

    const { sessionId, placement = 'product_page', productId } = req.query;

    if (typeof sessionId !== 'string' || !sessionId || sessionId.length > 64) {
        return res.status(400).json({ success: false, message: 'Invalid sessionId' });
    }
    if (!PLACEMENTS.includes(placement)) {
        return res.status(400).json({ success: false, message: 'Invalid placement' });
    }

    let contextProduct = null;
    if (productId && mongoose.isValidObjectId(productId)) {
        contextProduct = await Product.findById(productId)
            .select('category subcategory tags price')
            .lean();
    }

    const ads = await selectAds({ sessionId, placement, contextProduct });

    res.status(200).json({ success: true, ads });
});
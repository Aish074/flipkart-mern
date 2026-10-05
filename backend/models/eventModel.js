const mongoose = require('mongoose');

const EVENT_TYPES = [
    'product_impression',
    'product_click',
    'product_view',
    'add_to_cart',
    'search',
    'category_visit',
    'ad_impression',
    'ad_click',
];

const eventSchema = new mongoose.Schema({
    sessionId: { 
      type: String,
      required: true,
      maxlength: 64 
    },
    user: {
       type: mongoose.Schema.ObjectId,
        ref: 'User' 
    },        // only if logged in
    type: { 
      type: String, 
      enum: EVENT_TYPES, 
      required: true 
    },
    product: { 
      type: mongoose.Schema.ObjectId, 
      ref: 'Product' 
    },
    category: String,
    brand: String,
    price: Number,
    keyword: String,
    campaign: { 
      type: mongoose.Schema.ObjectId 
    },                 // used later for ad events
    createdAt: {
        type: Date,
        default: Date.now,
        expires: 60 * 60 * 24 * 30,       // auto-delete after 30 days
    },
});

// fast lookup of "this visitor's recent activity"
eventSchema.index({ sessionId: 1, createdAt: -1 });

module.exports = mongoose.model("Event", eventSchema);
module.exports.EVENT_TYPES = EVENT_TYPES;
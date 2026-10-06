const mongoose = require('mongoose');

const TRIGGERS = ['product_view', 'product_click', 'add_to_cart', 'search', 'category_visit'];
const PLACEMENTS = ['product_page', 'home'];

const campaignSchema = new mongoose.Schema({
    name: { 
      type: String, 
      required: [true, 'Please enter campaign name'], 
      trim: true 
    },

    // the product being advertised
    product: { 
      type: mongoose.Schema.ObjectId, 
      ref: 'Product', 
      required: true 
    },
    headline: { 
      type: String, 
      trim: true, 
      maxlength: 80 },

    // who should see it--- the shopper's context
    targeting: {
        categories: [{ 
          type: String, 
          lowercase: true, 
          trim: true }],
        subcategories: [{ 
          type: String, 
          lowercase: true, 
          trim: true }],
        tags: [{ 
          type: String, 
          lowercase: true, 
          trim: true }],
        minPrice: { 
          type: Number, 
          default: 0 
        },
        maxPrice: { 
          type: Number, 
          default: 1000000000 
        },
        triggerEvents: [{ 
          type: String, 
          enum: TRIGGERS 
        }],
    },

    placements: [{ 
      type: String, 
      enum: PLACEMENTS 
    }],
    bid: { 
      type: Number, 
      default: 1, 
      min: 0 
    },          // used for ranking
    dailyBudget: { 
      type: Number, 
      default: 0, 
      min: 0 },  // 0 = no limit
    status: { 
      type: String, 
      enum: ['active', 'paused'], 
      default: 'active' 
    },

    createdBy: { 
      type: mongoose.Schema.ObjectId, 
      ref: 'User' 
    },
    createdAt: { 
      type: Date, 
      default: Date.now 
    },
});

module.exports = mongoose.model('Campaign', campaignSchema);
module.exports.PLACEMENTS = PLACEMENTS;
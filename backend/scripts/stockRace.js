// backend/scripts/stockRace.js
// Run from the project root: node backend/scripts/stockRace.js <productId>
require('dotenv').config({ path: 'backend/config/config.env' });
const mongoose = require('mongoose');
const Product = require('../models/productModel');

const productId = process.argv[2];
if (!productId) {
    console.error('Usage: node backend/scripts/stockRace.js <productId>');
    process.exit(1);
}

// Version 1: "check the stock, then save", the usual first attempt at a fix.
// The 50 ms wait widens the race window so it shows up every time.
// Without it the bug is real but only appears occasionally.
async function naiveReserve(id, qty) {
    const product = await Product.findById(id);
    if (product.stock < qty) return false;
    await new Promise((resolve) => setTimeout(resolve, 50));
    product.stock -= qty;
    await product.save({ validateBeforeSave: false });
    return true;
}

// Version 2: one atomic operation. MongoDB checks and decrements together.
async function atomicReserve(id, qty) {
    const updated = await Product.findOneAndUpdate(
        { _id: id, stock: { $gte: qty } },
        { $inc: { stock: -qty } },
        { new: true }
    );
    return updated !== null;
}

async function run(label, reserve) {
    await Product.updateOne({ _id: productId }, { stock: 1 }); // reset to 1 unit
    const results = await Promise.all([
        reserve(productId, 1), // buyer A
        reserve(productId, 1), // buyer B, at the same moment
    ]);
    const { stock } = await Product.findById(productId);
    console.log(`\n${label}`);
    console.log('Buyer A got the item:', results[0]);
    console.log('Buyer B got the item:', results[1]);
    console.log('Final stock:', stock);
}

(async () => {
    await mongoose.connect(process.env.MONGO_URI);
    await run('NAIVE (check, then save)', naiveReserve);
    await run('ATOMIC (findOneAndUpdate)', atomicReserve);
    await mongoose.disconnect();
})();
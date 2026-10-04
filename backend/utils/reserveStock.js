const Product = require('../models/productModel');

// Takes stock for every item in an order, atomically per product.
// If any item is short, it gives back what it already took and reports which one failed.
async function reserveStock(items) {
    const reserved = [];

    for (const item of items) {
        // Reject bad quantities. A negative number would otherwise ADD stock.
        if (!Number.isInteger(item.quantity) || item.quantity < 1) {
            await releaseStock(reserved);
            return { ok: false, name: item.name, reason: 'Invalid quantity' };
        }

        const updated = await Product.findOneAndUpdate(
            { _id: item.product, stock: { $gte: item.quantity } },
            { $inc: { stock: -item.quantity } },
            { new: true }
        );

        if (!updated) {
            await releaseStock(reserved);
            return { ok: false, name: item.name, reason: 'Out of stock' };
        }
        reserved.push(item);
    }
    return { ok: true };
}

async function releaseStock(items) {
    for (const item of items) {
        await Product.updateOne({ _id: item.product }, { $inc: { stock: item.quantity } });
    }
}

module.exports = { reserveStock, releaseStock };
// models/Product.js

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ProductSchema = new Schema({
  productName: { type: String, required: true },
  productQty: { type: Number, required: true },
  productRate: { type: Number, required: true },
  productTotal: { type: Number, required: true },
  productGST: { type: Number, required: true }
}, { timestamps: true });

module.exports = ProductSchema;  // Exporting schema, not model

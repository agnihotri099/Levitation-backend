// models/User.js

const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const ProductSchema = require('./Product');  // Importing ProductSchema

const UserSchema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  products: [ProductSchema]  // Using the imported ProductSchema
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import products from './data/products.js';
import categories from './data/categories.js';
import users from './data/users.js';
import Product from './models/productModel.js';
import User from './models/userModel.js';
import Order from './models/orderModel.js';
import Category from './models/categoryModel.js';
import connectDB from './config/db.js';

dotenv.config();

await connectDB({ strict: true });

const importData = async () => {
  try {
    console.warn('[seeder] WARNING: data:import is destructive and will delete existing users/products/categories/orders.');
    await Order.deleteMany();
    await Product.deleteMany();
    await Category.deleteMany();
    await User.deleteMany();

    const createdUsers = await User.insertMany(users);
    const adminUser = createdUsers[0]._id;

    const sampleProducts = products.map((p) => {
      return { ...p, user: adminUser };
    });

    await Product.insertMany(sampleProducts);
    await Category.insertMany(categories);
    console.log('Data Imported!');
    process.exit();
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

const destroyData = async () => {
  try {
    console.warn('[seeder] WARNING: data:destroy is destructive and will delete existing users/products/categories/orders.');
    await Order.deleteMany();
    await Product.deleteMany();
    await Category.deleteMany();
    await User.deleteMany();
    console.log('Data Destroyed!');
    process.exit();
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

if (process.argv[2] === '-d') {
  destroyData();
} else {
  importData();
}

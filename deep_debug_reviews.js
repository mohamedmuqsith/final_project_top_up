const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, 'backend', '.env') });

async function debug() {
  try {
    await mongoose.connect(process.env.DB_URL);
    console.log('Connected to MongoDB');

    // Find the primary user (the one from the screenshots)
    const user = await mongoose.connection.db.collection('users').findOne({ email: 'mukshith.fiverr35@gmail.com' });
    if (!user) {
      console.log('User not found by email');
      process.exit(0);
    }
    console.log('User found:', { id: user._id, clerkId: user.clerkId });

    // Find all orders for this user
    const orders = await mongoose.connection.db.collection('orders').find({ clerkId: user.clerkId }).toArray();
    console.log(`Found ${orders.length} orders for this user.`);
    
    // Find all reviews for this user
    const reviews = await mongoose.connection.db.collection('reviews').find({ userId: user._id }).toArray();
    console.log(`Found ${reviews.length} reviews for this user ID.`);

    if (reviews.length > 0) {
      console.log('Sample review productIds:', reviews.map(r => r.productId.toString()));
    }

    // Check if any product in any order matches any review
    const allOrderProductIds = new Set();
    orders.forEach(o => {
      o.orderItems.forEach(item => {
        allOrderProductIds.add(item.product.toString());
      });
    });
    console.log('All Product IDs in User Orders:', Array.from(allOrderProductIds));

    const reviewedProductIds = new Set(reviews.map(r => r.productId.toString()));
    console.log('All Product IDs in User Reviews:', Array.from(reviewedProductIds));

    const intersection = Array.from(allOrderProductIds).filter(x => reviewedProductIds.has(x));
    console.log('Matches found (reviewed items in orders):', intersection);

    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

debug();

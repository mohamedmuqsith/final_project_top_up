const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

async function run() {
  try {
    await mongoose.connect(process.env.DB_URL);
    console.log('Connected to MongoDB');

    const email = 'mukshith.fiverr35@gmail.com';
    const users = await mongoose.connection.db.collection('users').find({ email }).toArray();
    console.log(`\nFound ${users.length} users with email ${email}:`);
    
    const userIds = users.map(u => u._id);
    const clerkIds = users.map(u => u.clerkId);

    users.forEach(u => console.log(`  - _id: ${u._id}, clerkId: ${u.clerkId}`));

    const reviews = await mongoose.connection.db.collection('reviews').find({ userId: { $in: userIds } }).toArray();
    console.log(`\nTotal reviews for these users: ${reviews.length}`);
    reviews.forEach(r => console.log(`  - Review: ${r._id}, userId: ${r.userId}, productId: ${r.productId}, rating: ${r.rating}`));

    const orders = await mongoose.connection.db.collection('orders').find({ clerkId: { $in: clerkIds } }).toArray();
    console.log(`\nTotal orders for these clerkIds: ${orders.length}`);
    orders.forEach(o => {
      console.log(`  - Order: ${o._id}, clerkId: ${o.clerkId}, user: ${o.user}, items: ${o.orderItems.length}`);
      o.orderItems.forEach(i => {
        console.log(`    Item: ${i.name}, product ID: ${i.product}`);
      });
    });

    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

run();

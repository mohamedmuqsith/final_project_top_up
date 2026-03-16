const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, 'backend', '.env') });

async function inspect() {
  try {
    await mongoose.connect(process.env.DB_URL);
    console.log('Connected to MongoDB');

    const user = await mongoose.connection.db.collection('users').findOne({ email: 'mukshith.fiverr35@gmail.com' });
    console.log('User ID:', user._id);
    console.log('User clerkId:', user.clerkId);

    const orders = await mongoose.connection.db.collection('orders').find({ clerkId: user.clerkId }).toArray();
    console.log('Total Orders:', orders.length);
    orders.forEach(o => {
      console.log(`Order ${o._id}: status=${o.status}, items=${o.orderItems.length}`);
      o.orderItems.forEach(i => {
        console.log(`  Item: ${i.name}, product field type: ${typeof i.product}, product value: ${i.product}`);
      });
    });

    const reviews = await mongoose.connection.db.collection('reviews').find({ userId: user._id }).toArray();
    console.log('Total Reviews for this User ID:', reviews.length);
    reviews.forEach(r => {
      console.log(`  Review ${r._id}: productId=${r.productId}, rating=${r.rating}`);
    });

    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

inspect();

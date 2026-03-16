const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, 'backend', '.env') });

async function analyze() {
  try {
    await mongoose.connect(process.env.DB_URL);
    console.log('Connected to MongoDB');

    const reviews = await mongoose.connection.db.collection('reviews').find({}).toArray();
    console.log('Total reviews in DB:', reviews.length);

    const dupMap = new Map();
    const emptyComments = [];

    reviews.forEach(r => {
      const key = `${r.userId}_${r.productId}`;
      if (!dupMap.has(key)) {
        dupMap.set(key, []);
      }
      dupMap.get(key).push(r);

      if (!r.comment || r.comment.trim() === '') {
        emptyComments.push(r);
      }
    });

    console.log('\n--- Duplicate Analysis ---');
    let hasDups = false;
    for (const [key, docs] of dupMap.entries()) {
      if (docs.length > 1) {
        hasDups = true;
        console.log(`Duplicate found for key ${key}: ${docs.length} instances`);
        docs.forEach(d => console.log(`  _id: ${d._id}, rating: ${d.rating}, comment: "${d.comment}", createdAt: ${d.createdAt}`));
      }
    }
    if (!hasDups) console.log('No duplicates found for (userId, productId) pairs.');

    console.log('\n--- Empty Comment Analysis ---');
    console.log(`Total reviews with empty comments: ${emptyComments.length}`);
    if (emptyComments.length > 0) {
      console.log('Sample empty comment reviews (last 3):');
      emptyComments.slice(-3).forEach(r => {
        console.log(`  _id: ${r._id}, user: ${r.userId}, product: ${r.productId}, date: ${r.createdAt}`);
      });
    }

    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

analyze();

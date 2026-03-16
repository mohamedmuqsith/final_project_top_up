const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, 'backend', '.env') });

async function check() {
  try {
    await mongoose.connect(process.env.DB_URL);
    console.log('Connected to MongoDB');

    const reviews = await mongoose.connection.db.collection('reviews').find({ 
      comment: { $exists: true, $ne: '' } 
    }).toArray();

    console.log('Reviews with comments:', reviews.length);
    console.log(JSON.stringify(reviews, null, 2));

    const allReviews = await mongoose.connection.db.collection('reviews').find({}).sort({createdAt: -1}).limit(5).toArray();
    console.log('Most recent 5 reviews:', JSON.stringify(allReviews, null, 2));

    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

check();

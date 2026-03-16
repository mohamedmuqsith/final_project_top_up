const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load env from backend
dotenv.config({ path: path.join(__dirname, 'backend', '.env') });

const reviewSchema = new mongoose.Schema({
  productId: mongoose.Schema.Types.ObjectId,
  userId: mongoose.Schema.Types.ObjectId,
  createdAt: { type: Date, default: Date.now }
});

const Review = mongoose.model('Review', reviewSchema);

async function cleanup() {
  try {
    if (!process.env.DB_URL) {
      console.error('DB_URL not found in .env');
      process.exit(1);
    }
    await mongoose.connect(process.env.DB_URL);
    console.log('Connected to MongoDB');

    const duplicates = await Review.aggregate([
      {
        $group: {
          _id: { productId: '$productId', userId: '$userId' },
          ids: { $push: '$_id' },
          count: { $sum: 1 }
        }
      },
      { $match: { count: { $gt: 1 } } }
    ]);

    console.log(`Found ${duplicates.length} duplicate sets`);

    for (const duo of duplicates) {
      const allIds = duo.ids;
      const docs = await Review.find({ _id: { $in: allIds } }).sort({ createdAt: -1 });
      const [keep, ...remove] = docs;
      
      console.log(`Keeping ${keep._id} for product ${duo._id.productId}, removing ${remove.length} duplicates`);
      await Review.deleteMany({ _id: { $in: remove.map(d => d._id) } });
    }

    console.log('Cleanup finished. Attempting to ensure unique index...');
    await mongoose.connection.db.collection('reviews').createIndex({ productId: 1, userId: 1 }, { unique: true });
    
    console.log('Unique index created successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Cleanup failed:', error);
    process.exit(1);
  }
}

cleanup();

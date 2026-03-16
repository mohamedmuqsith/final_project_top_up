import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

async function fullMerge() {
  try {
    await mongoose.connect(process.env.DB_URL);
    console.log('Connected to MongoDB');

    const emails = ['mukshith.fiverr35@gmail.com', 'mohamedmukshidh35@gmail.com'];
    const users = await mongoose.connection.db.collection('users').find({ email: { $in: emails } }).toArray();
    
    if (users.length < 2) {
      console.log('No duplicate accounts to merge.');
      process.exit(0);
    }

    console.log(`Found ${users.length} accounts to reconcile.`);
    
    // We'll merge everything into the one that has the most orders/reviews or just pick one
    // Let's pick 'user_3AvpcLP5Cf1srvXPhTHJJ2qDb' as the target because it has the orders shown in the screenshot
    const targetUser = users.find(u => u.clerkId === 'user_3AvpcLP5Cf1srvXPhTHJJ2qDb') || users[0];
    const otherUserIds = users.filter(u => u._id.toString() !== targetUser._id.toString()).map(u => u._id);

    console.log(`Target: ${targetUser.email} (${targetUser._id})`);
    
    // Move ALL orders for BOTH emails to the target account
    const orderRes = await mongoose.connection.db.collection('orders').updateMany(
      { user: { $in: otherUserIds } },
      { $set: { user: targetUser._id, clerkId: targetUser.clerkId } }
    );
    console.log(`Updated ${orderRes.modifiedCount} orders.`);

    // Move ALL reviews for BOTH emails to the target account
    const reviewRes = await mongoose.connection.db.collection('reviews').updateMany(
      { userId: { $in: otherUserIds } },
      { $set: { userId: targetUser._id } }
    );
    console.log(`Updated ${reviewRes.modifiedCount} reviews.`);

    console.log('Merge successful!');
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

fullMerge();

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

async function merge() {
  try {
    await mongoose.connect(process.env.DB_URL);
    console.log('Connected to MongoDB');

    const email = 'mukshith.fiverr35@gmail.com';
    const users = await mongoose.connection.db.collection('users').find({ email }).toArray();
    
    if (users.length < 2) {
      console.log('No duplicate accounts found for this email.');
      process.exit(0);
    }

    const targetUser = users.find(u => u.clerkId === 'user_3AvpcLP5Cf1srvXPhTHJJ2qDb') || users[0];
    const otherUserIds = users.filter(u => u._id.toString() !== targetUser._id.toString()).map(u => u._id);

    console.log(`Merging ${otherUserIds.length} accounts into target user ${targetUser._id} (${targetUser.clerkId})`);

    const orderRes = await mongoose.connection.db.collection('orders').updateMany(
      { user: { $in: otherUserIds } },
      { $set: { user: targetUser._id, clerkId: targetUser.clerkId } }
    );
    console.log(`Updated ${orderRes.modifiedCount} orders by user field.`);

    const clerkIdsToMerge = users.filter(u => u.clerkId !== targetUser.clerkId).map(u => u.clerkId);
    const orderRes2 = await mongoose.connection.db.collection('orders').updateMany(
      { clerkId: { $in: clerkIdsToMerge } },
      { $set: { user: targetUser._id, clerkId: targetUser.clerkId } }
    );
    console.log(`Updated ${orderRes2.modifiedCount} orders by clerkId.`);

    const reviewRes = await mongoose.connection.db.collection('reviews').updateMany(
      { userId: { $in: otherUserIds } },
      { $set: { userId: targetUser._id } }
    );
    console.log(`Updated ${reviewRes.modifiedCount} reviews.`);

    const deleteRes = await mongoose.connection.db.collection('users').deleteMany({
      _id: { $in: otherUserIds }
    });
    console.log(`Deleted ${deleteRes.deletedCount} redundant user records.`);

    console.log('Merge successful!');
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

merge();

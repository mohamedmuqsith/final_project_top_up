import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Notification } from './src/models/notification.model.js';
import { User } from './src/models/user.model.js';

dotenv.config();

async function cleanup() {
  try {
    await mongoose.connect(process.env.DB_URL);
    console.log('Connected to database for cleanup...');

    const customerTypes = ['ORDER_PLACED', 'PAYMENT_SUCCESS', 'ORDER_SHIPPED', 'ORDER_DELIVERED', 'ORDER_CANCELLED'];
    
    // 1. Remove admin notifications that use customer-only types
    const res1 = await Notification.deleteMany({
      recipientType: 'admin',
      type: { $in: customerTypes }
    });
    console.log(`Removed ${res1.deletedCount} admin notifications with customer types.`);

    // 2. Remove admin notifications containing customer-facing keywords (Legacy cleanup)
    const keywords = [
      'Your order', 'Enjoy your', 'Great news', 'Your payment', 
      'successfully delivered', 'has been shipped', 'marked as shipped', 
      'marked as delivered', 'order has been placed'
    ];
    // Note: We only delete these if they are for ADMINS because we want to preserve customer history
    const res2 = await Notification.deleteMany({
      recipientType: 'admin',
      $or: keywords.map(kw => ({ message: { $regex: kw, $options: 'i' } }))
    });
    console.log(`Removed ${res2.deletedCount} admin notifications with customer wording.`);

    // 3. Remove customer notifications that use admin-only types
    const adminTypes = ['NEW_ORDER', 'ORDER_MARKED_SHIPPED', 'ORDER_MARKED_DELIVERED', 'LOW_STOCK', 'PREDICTED_STOCKOUT', 'PAYMENT_FAILED', 'OUT_OF_STOCK'];
    const res3 = await Notification.deleteMany({
      recipientType: 'customer',
      type: { $in: adminTypes }
    });
    console.log(`Removed ${res3.deletedCount} customer notifications with admin types.`);

    // 4. Ensure all users have a role (default to 'user')
    const res4 = await User.updateMany(
      { $or: [{ role: { $exists: false } }, { role: null }] },
      { $set: { role: 'user' } }
    );
    console.log(`Updated ${res4.modifiedCount} users with missing roles.`);

    console.log('Cleanup complete.');
    process.exit(0);
  } catch (error) {
    console.error('Cleanup failed:', error);
    process.exit(1);
  }
}

cleanup();

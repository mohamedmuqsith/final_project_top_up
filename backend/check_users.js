
import mongoose from 'mongoose';
import { User } from './src/models/user.model.js';
import { ENV } from './src/config/env.js';

async function checkUsers() {
  try {
    await mongoose.connect(ENV.DB_URL);
    const users = await User.find({});
    console.log('Total users:', users.length);
    users.forEach(u => {
      console.log(`- ${u.name} | ${u.email} | Role: ${u.role} | ClerkID: ${u.clerkId}`);
    });
    console.log('Current ADMIN_EMAIL in ENV:', ENV.ADMIN_EMAIL);
    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
  }
}

checkUsers();

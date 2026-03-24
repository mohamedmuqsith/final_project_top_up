import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: './.env' });

const settingsSchema = new mongoose.Schema({
  tax: {
    rate: Number,
    enabled: Boolean,
    label: String
  },
  shipping: {
    defaultFee: Number,
    freeThreshold: Number
  },
  localization: {
    currency: String,
    currencySymbol: String
  }
}, { strict: false });

const Settings = mongoose.model('Settings', settingsSchema);

async function checkSettings() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const s = await Settings.findOne();
    console.log('---SETTINGS_START---');
    console.log(JSON.stringify(s, null, 2));
    console.log('---SETTINGS_END---');
    await mongoose.disconnect();
  } catch (err) {
    console.error(err);
  }
}

checkSettings();

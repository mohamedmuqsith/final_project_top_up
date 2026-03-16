import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';
import { GoogleGenerativeAI } from '@google/generative-ai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

async function run() {
  console.log('--- Backend Diagnostic ---');
  
  // 1. Check ENVs
  const requiredEnvs = [
    'DB_URL', 
    'CLERK_SECRET_KEY', 
    'STRIPE_SECRET_KEY', 
    'GEMINI_API_KEY',
    'CLOUDINARY_CLOUD_NAME'
  ];
  
  requiredEnvs.forEach(key => {
    if (process.env[key]) {
      console.log(`✅ ${key} is set`);
    } else {
      console.warn(`❌ ${key} is NOT set`);
    }
  });

  // 2. Check MongoDB
  try {
    await mongoose.connect(process.env.DB_URL);
    console.log('✅ Connected to MongoDB');
    
    // Check collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log(`✅ Found ${collections.length} collections: ${collections.map(c => c.name).join(', ')}`);
    
  } catch (error) {
    console.error('❌ MongoDB Connection Failed:', error.message);
  }

  // 3. Check Gemini
  if (process.env.GEMINI_API_KEY) {
    try {
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const result = await model.generateContent("Hello, respond with 'Connectivity Test Success'");
      console.log(`✅ Gemini Connectivity: ${result.response.text().trim()}`);
    } catch (error) {
      console.error('❌ Gemini Connectivity Failed:', error.message);
    }
  }

  console.log('--- Diagnostic Complete ---');
  await mongoose.disconnect();
}

run().catch(err => {
  console.error('Fatal error in diagnostic:', err);
});

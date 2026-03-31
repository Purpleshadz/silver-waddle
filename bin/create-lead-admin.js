require('dotenv').config();
const readlineSync = require('readline-sync');
const { connectDB } = require('../src/config/db');
const User = require('../src/models/User');

async function main() {
  await connectDB();
  console.log('=== Create Lead Admin ===');
  const username = readlineSync.question('Username: ');
  const password = readlineSync.questionNewPassword('Password: ', { min: 6 });

  const existing = await User.findOne({ username });
  if (existing) {
    console.error('Error: Username already taken');
    process.exit(1);
  }

  const user = new User({ username, password, role: 'lead_admin' });
  await user.save();
  console.log(`Lead admin "${username}" created successfully.`);
  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });

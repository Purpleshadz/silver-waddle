require('dotenv').config();
const readlineSync = require('readline-sync');
const { connectDB } = require('../src/config/db');
const User = require('../src/models/User');
const Organization = require('../src/models/Organization');

async function main() {
  await connectDB();
  console.log('=== Create Admin User ===');
  console.log('Authenticate as lead_admin:');
  const authUsername = readlineSync.question('Lead admin username: ');
  const authPassword = readlineSync.question('Lead admin password: ', { hideEchoBack: true });

  const authUser = await User.findOne({ username: authUsername, role: 'lead_admin' });
  if (!authUser || !(await authUser.comparePassword(authPassword))) {
    console.error('Authentication failed');
    process.exit(1);
  }

  console.log('\nNew admin details:');
  const username = readlineSync.question('Username: ');
  const password = readlineSync.questionNewPassword('Password: ', { min: 6 });

  const existing = await User.findOne({ username });
  if (existing) {
    console.error('Error: Username already taken');
    process.exit(1);
  }

  const orgs = await Organization.find();
  let orgIds = [];
  if (orgs.length > 0) {
    console.log('\nAvailable organizations:');
    orgs.forEach((o, i) => console.log(`  ${i + 1}. ${o.name}`));
    const input = readlineSync.question('Assign to orgs (comma-separated numbers, or press Enter to skip): ');
    if (input.trim()) {
      orgIds = input.split(',').map(s => {
        const idx = parseInt(s.trim(), 10) - 1;
        return (idx >= 0 && idx < orgs.length) ? orgs[idx]._id : null;
      }).filter(Boolean);
    }
  }

  const user = new User({ username, password, role: 'admin', organizations: orgIds });
  await user.save();
  console.log(`Admin "${username}" created successfully.`);
  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });

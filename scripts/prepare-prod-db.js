const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, '../prisma/schema.prisma');
try {
  let content = fs.readFileSync(schemaPath, 'utf8');
  if (content.includes('provider = "sqlite"')) {
    content = content.replace('provider = "sqlite"', 'provider = "postgresql"');
    fs.writeFileSync(schemaPath, content, 'utf8');
    console.log('✅ Successfully switched Prisma provider to postgresql for production.');
  } else {
    console.log('ℹ️  Prisma provider is already postgresql.');
  }
} catch (e) {
  console.error('❌ Failed to run prepare-prod-db.js:', e);
  process.exit(1);
}

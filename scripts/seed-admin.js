const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

async function main() {
  const db = new PrismaClient()
  const hash = await bcrypt.hash('admin', 10)
  await db.user.update({
    where: { email: 'admin@admin.com' },
    data: { passwordHash: hash }
  })
  console.log('Updated admin password to: admin')
  await db.$disconnect()
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})

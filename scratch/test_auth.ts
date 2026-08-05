import 'dotenv/config'
import { prisma } from '../src/lib/prisma'
import { issueEmailVerifyToken, consumeEmailVerifyToken } from '../src/lib/emailVerifyToken'
import { hashPassword } from '../src/lib/auth'
import { getBaseUrl } from '../src/lib/utils'

async function test() {
  console.log('--- TEST: Auth Logic ---')
  const testEmail = 'test-e2e-auth@purity-agency.be'

  try {
    // 1. Cleanup
    await prisma.magicLinkToken.deleteMany({ where: { user: { email: testEmail } } })
    await prisma.user.deleteMany({ where: { email: testEmail } })
    console.log('[OK] Cleanup done')

    // 2. Simulate Registration
    const user = await prisma.user.create({
      data: {
        email: testEmail,
        name: 'Test E2E',
        role: 'CLIENT',
        passwordHash: hashPassword('password123'),
      },
    })
    console.log('[OK] User created:', user.id)

    // 3. Issue Token
    const rawToken = await issueEmailVerifyToken(user.id)
    console.log('[OK] Token issued. Raw token length:', rawToken.length)

    // 4. Verify Base URL generation
    process.env.NODE_ENV = 'production'
    process.env.NEXTAUTH_URL = 'http://localhost:3001'
    const url = getBaseUrl()
    console.log('[OK] getBaseUrl in fake production with localhost returns:', url)
    if (url === 'http://localhost:3001') {
      throw new Error('getBaseUrl failed to override localhost in production!')
    }

    // 5. Consume Token
    const verifiedUser = await consumeEmailVerifyToken(rawToken)
    if (!verifiedUser) {
      throw new Error('consumeEmailVerifyToken returned null!')
    }
    console.log('[OK] Token consumed successfully for user:', verifiedUser.email)

    // 6. Update user (simulate route logic)
    await prisma.user.update({ where: { id: verifiedUser.id }, data: { emailVerified: new Date() } })
    
    const checkUser = await prisma.user.findUnique({ where: { email: testEmail } })
    console.log('[OK] User emailVerified state:', checkUser?.emailVerified !== null ? 'Verified' : 'Unverified')
    
    // 7. Cleanup
    await prisma.magicLinkToken.deleteMany({ where: { user: { email: testEmail } } })
    await prisma.user.deleteMany({ where: { email: testEmail } })
    console.log('[OK] Test finished successfully!')

  } catch (err) {
    console.error('[FAILED]', err)
  } finally {
    await prisma.$disconnect()
  }
}

test()

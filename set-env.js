const { execSync } = require('child_process');

const vars = {
  DATABASE_URL: "postgresql://neondb_owner:npg_JoOVNTRh9l4K@ep-little-smoke-asdmea7q-pooler.c-4.eu-central-1.aws.neon.tech/neondb?channel_binding=require&sslmode=require&pgbouncer=true",
  NEXTAUTH_URL: "https://purity-os.vercel.app",
};

for (const [key, value] of Object.entries(vars)) {
  try {
    // Use stdin to pass the value safely (avoids shell escaping issues)
    const result = execSync(`npx vercel env add ${key} production`, {
      input: value + '\n',
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe']
    });
    console.log(`✅ ${key} set:`, result.trim());
  } catch (e) {
    console.log(`⚠️  ${key}:`, e.stderr || e.stdout || e.message);
  }
}

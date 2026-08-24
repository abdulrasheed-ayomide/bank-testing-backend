import bcrypt from 'bcrypt';
import readline from 'readline';

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

rl.question('Enter the admin password to hash: ', async (password) => {
  if (!password || password.length < 8) {
    console.error('Password must be at least 8 characters.');
    rl.close();
    process.exit(1);
  }

  const hash = await bcrypt.hash(password, 12);
  console.log('\nAdd this line to your backend .env file:\n');
  console.log(`ADMIN_PASSWORD_HASH=${hash}\n`);
  rl.close();
});

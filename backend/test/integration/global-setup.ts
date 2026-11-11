import { execSync } from 'child_process';
import { join } from 'path';
import { TEST_DATABASE_URL } from './test-env';

export default function globalSetup(): void {
  execSync('npx prisma migrate deploy', {
    cwd: join(__dirname, '..', '..'),
    env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
    stdio: 'inherit',
  });
}

import { FlowCtx } from '../../../../../shared/types';
import fs from 'fs/promises';
import path from 'node:path';
import type { PostgresConnection } from '../../../../../shared/validation';
import { createTwoFilesPatch } from 'diff';
import { promptYesNo } from '../../../../../shared/prompt';

/**
 * Generate .env file from template using collected connection and user data
 */
export default async function step(ctx: FlowCtx): Promise<void> {
  const connection = ctx.vars.connection as PostgresConnection;
  const dbUsers = ctx.vars.dbUsers as {
    admin: { user: string; password: string };
    tester: { user: string; password: string };
  };

  if (!connection || !dbUsers) {
    throw new Error('Missing connection or dbUsers in context. Ensure previous steps ran correctly.');
  }

  const templatePath = path.join(ctx.artifactsDir, 'templates', 'postgres.env_template');
  const envPath = process.env.NODE_ENV === 'test'
    ? path.join(process.cwd(), '.env_test_generated')
    : path.join(process.cwd(), '.env.local');

  const template = await fs.readFile(templatePath, 'utf-8');

  const envContent = template
    .replace('{{LOCAL_DB_HOST}}', connection.host)
    .replace('{{LOCAL_DB_PORT}}', String(connection.port))
    .replace('{{LOCAL_DB_USER}}', connection.user)
    .replace('{{LOCAL_DB_PASSWORD}}', connection.password || '')
    .replace('{{LOCAL_DB_NAME}}', connection.database)
    .replace('{{LOCAL_DB_ADMIN_USER}}', dbUsers.admin.user)
    .replace('{{LOCAL_DB_ADMIN_PASSWORD}}', dbUsers.admin.password)
    .replace('{{LOCAL_DB_TEST_USER}}', dbUsers.tester.user)
    .replace('{{LOCAL_DB_TEST_PASSWORD}}', dbUsers.tester.password);

  let shouldWrite = true;
  let existingContent = '';

  try {
    await fs.access(envPath);

    existingContent = await fs.readFile(envPath, 'utf-8');
    const hasYesFlag = ctx.vars.yes || process.argv.includes('--yes') || process.argv.includes('-Y');

    if (existingContent === envContent) {
      ctx.logger.info('.env.local already up to date. No changes.');
      return;
    }

    if (hasYesFlag) {
      ctx.logger.info('Overwriting .env.local (--yes flag set)');
    } else {
      const diff = createTwoFilesPatch('.env.local', '.env.local (new)', existingContent, envContent, '', '');
      ctx.logger.raw(`\n${diff}`);
      shouldWrite = await promptYesNo('.env.local has changes. Overwrite with above?', false);
      if (!shouldWrite) {
        ctx.logger.info('Skipping environment file generation');
        return;
      }
    }
  } catch {
    // file doesn't exist  --  proceed
    ctx.logger.info('.env.local not found, will generate a new one.');
  }

  await fs.writeFile(envPath, envContent);
  ctx.logger.info(`Environment file generated at ${envPath}`);
}

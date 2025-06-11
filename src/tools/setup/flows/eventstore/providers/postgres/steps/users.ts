import { FlowCtx } from '../../../../../shared/types';
import { promptText, promptPassword } from '../../../../../shared/prompt';
import pg from 'pg';

/**
 * Create default users for database
 */
export default async function step(ctx: FlowCtx): Promise<void> {
  const pool = ctx.vars.pool as pg.Pool;
  if (!pool) throw new Error('Missing database pool in context');

  const existingRoles = await pool.query(`SELECT rolname FROM pg_roles`);
  const roleNames = new Set(existingRoles.rows.map(r => r.rolname));

  const adminExists = roleNames.has('intent_admin_api');
  const testerExists = roleNames.has('intent_test_user');

  if (adminExists && testerExists) {
    ctx.logger.info('Both DB users already exist, skipping user creation');
    ctx.vars.dbUsers = {
      admin: {
        user: process.env.LOCAL_DB_ADMIN_USER || 'intent_admin_api',
        password: process.env.LOCAL_DB_ADMIN_PASSWORD || 'adminpassword'
      },
      tester: {
        user: process.env.LOCAL_DB_TEST_USER || 'intent_test_user',
        password: process.env.LOCAL_DB_TEST_PASSWORD || 'testpassword'
      }
    };
    return;
  }

  ctx.logger.info('Creating DB users...');

  const adminUser = await promptText('Admin username:', 'intent_admin_api');
  const adminPass = await promptPassword('Admin password:', () => true);
  const testerUser = await promptText('Tester username:', 'intent_test_user');
  const testerPass = await promptPassword('Tester password:', () => true);

  await pool.query(`CREATE ROLE ${adminUser} WITH LOGIN PASSWORD '${adminPass}'`,);
  await pool.query(`CREATE ROLE ${testerUser} WITH LOGIN PASSWORD '${testerPass}'`);

  // Permissions for admin
  await pool.query(`GRANT USAGE ON SCHEMA public, infra TO ${adminUser}`);
  await pool.query(`GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public, infra TO ${adminUser}`);
  await pool.query(`ALTER DEFAULT PRIVILEGES IN SCHEMA public, infra GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO ${adminUser}`);

  // Permissions for tester
  await pool.query(`GRANT USAGE ON SCHEMA public TO ${testerUser}`);
  await pool.query(`GRANT SELECT ON ALL TABLES IN SCHEMA public TO ${testerUser}`);
  await pool.query(`ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO ${testerUser}`);

  // Persist for .env generation
  ctx.vars.dbUsers = {
    admin: { user: adminUser, password: adminPass },
    tester: { user: testerUser, password: testerPass }
  };

  ctx.logger.info(`Created users: ${adminUser}, ${testerUser}`);
}

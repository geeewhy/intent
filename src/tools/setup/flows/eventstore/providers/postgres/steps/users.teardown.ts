import { FlowCtx } from '../../../../../shared/types';
import pg from 'pg';

/**
 * Teardown: remove DB users and their privileges
 */
export default async function step(ctx: FlowCtx): Promise<void> {
  const pool = ctx.vars.pool as pg.Pool;
  if (!pool) throw new Error('Missing database pool in context');

  const users = ['intent_admin_api', 'intent_test_user'];

  for (const role of users) {
    ctx.logger.info(`Cleaning up user: ${role}`);

    try {
      await pool.query(`REASSIGN OWNED BY ${role} TO postgres`);
      await pool.query(`DROP OWNED BY ${role}`);
      await pool.query(`DELETE FROM pg_default_acl WHERE defaclrole = $1::regrole`, [role]);
      await pool.query(`DROP ROLE IF EXISTS ${role}`);
      ctx.logger.info(`Dropped role: ${role}`);
    } catch (err) {
      ctx.logger.warn(`Error cleaning up ${role}: ${(err as Error).message}`);
    }
  }
}
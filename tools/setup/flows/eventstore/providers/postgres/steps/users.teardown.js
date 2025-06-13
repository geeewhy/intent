"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = step;
/**
 * Teardown: remove DB users and their privileges
 */
async function step(ctx) {
    const pool = ctx.vars.pool;
    if (!pool)
        throw new Error('Missing database pool in context');
    const users = ['intent_admin_api', 'intent_test_user'];
    for (const role of users) {
        ctx.logger.info(`Cleaning up user: ${role}`);
        try {
            await pool.query(`REASSIGN OWNED BY ${role} TO postgres`);
            await pool.query(`DROP OWNED BY ${role}`);
            await pool.query(`DELETE FROM pg_default_acl WHERE defaclrole = $1::regrole`, [role]);
            await pool.query(`DROP ROLE IF EXISTS ${role}`);
            ctx.logger.info(`Dropped role: ${role}`);
        }
        catch (err) {
            ctx.logger.warn(`Error cleaning up ${role}: ${err.message}`);
        }
    }
}
//# sourceMappingURL=users.teardown.js.map
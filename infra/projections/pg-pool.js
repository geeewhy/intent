"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPool = createPool;
//src/infra/projections/pg-pool.ts
const slonik_1 = require("slonik");
/**
 * Creates a Slonik database pool with the given configuration
 * @param connectionConfig Optional connection configuration
 * @returns A Slonik database pool
 */
function createPool(connectionConfig) {
    const connectionString = connectionConfig?.connectionString ||
        `postgres://${process.env.LOCAL_DB_USER || 'postgres'}:${process.env.LOCAL_DB_PASSWORD || 'postgres'}@${process.env.LOCAL_DB_HOST || 'localhost'}:${process.env.LOCAL_DB_PORT || '5432'}/${process.env.LOCAL_DB_NAME || 'postgres'}`;
    return (0, slonik_1.createPool)(connectionString);
}
//# sourceMappingURL=pg-pool.js.map
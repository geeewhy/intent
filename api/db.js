"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.testConnection = void 0;
const pg_1 = require("pg");
const dotenv_1 = __importDefault(require("dotenv"));
const stdLogger_1 = require("../infra/logger/stdLogger");
// Load environment variables from .env file
dotenv_1.default.config();
// Create a new pool using environment variables
const pool = new pg_1.Pool({
    host: process.env.LOCAL_DB_HOST,
    user: process.env.LOCAL_DB_ADMIN_USER,
    password: process.env.LOCAL_DB_ADMIN_PASSWORD,
    database: process.env.LOCAL_DB_NAME,
    // Default values for other connection parameters
    port: 5432,
    max: 20, // Maximum number of clients in the pool
    idleTimeoutMillis: 30000, // How long a client is allowed to remain idle before being closed
    connectionTimeoutMillis: 2000, // How long to wait for a connection to become available
});
// The pool will emit an error on behalf of any idle clients
// if a backend error or network partition happens
pool.on('error', (err) => {
    stdLogger_1.stdLogger.error('Unexpected error on idle client', { error: err });
    process.exit(-1);
});
// Function to test the database connection
const testConnection = async () => {
    const client = await pool.connect();
    try {
        const result = await client.query('SELECT NOW()');
        return { connected: true, timestamp: result.rows[0].now };
    }
    catch (error) {
        stdLogger_1.stdLogger.error('Database connection error:', { error });
        return { connected: false, error: error instanceof Error ? error.message : String(error) };
    }
    finally {
        client.release();
    }
};
exports.testConnection = testConnection;
exports.default = pool;
//# sourceMappingURL=db.js.map
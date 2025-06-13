"use strict";
/**
 * Supabase server entry point
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const http_1 = require("http");
const pg_event_store_1 = require("./infra/pg/pg-event-store");
const supabase_server_1 = require("./infra/supabase/supabase-server");
const dotenv_1 = __importDefault(require("dotenv"));
// Load environment variables
dotenv_1.default.config();
// Create express app
const app = (0, express_1.default)();
const port = parseInt(process.env.PORT || '3000');
// Serve static files from the public directory
app.use(express_1.default.static('public'));
// Parse JSON bodies
app.use(express_1.default.json());
// Create HTTP server
const server = (0, http_1.createServer)(app);
// Get Supabase credentials from environment variables
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
if (!supabaseUrl || !supabaseKey) {
    console.error('SUPABASE_URL and SUPABASE_KEY environment variables are required');
    process.exit(1);
}
// Create Supabase server
const supabaseServer = new supabase_server_1.SupabaseServer(supabaseUrl, supabaseKey);
// Initialize database schema
async function initDatabase() {
    try {
        console.log('Initializing database schema...');
        const eventStore = new pg_event_store_1.PgEventStore();
        console.log('Database schema initialized successfully');
    }
    catch (error) {
        console.error('Error initializing database schema:', error);
        process.exit(1);
    }
}
// Start the server
async function start() {
    // Initialize database schema
    await initDatabase();
    // Start the Supabase server
    await supabaseServer.start();
    // Start the HTTP server
    server.listen(port, () => {
        console.log(`HTTP server started on port ${port}`);
    });
}
// Handle errors
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    process.exit(1);
});
// Handle shutdown
process.on('SIGINT', async () => {
    console.log('Shutting down...');
    await supabaseServer.stop();
    process.exit(0);
});
// Start the server
start().catch((err) => {
    console.error(err);
    process.exit(1);
});
//# sourceMappingURL=server.js.map
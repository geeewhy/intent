"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/api/index.ts
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const db_1 = __importStar(require("./db"));
const stdLogger_1 = require("../infra/logger/stdLogger");
const routes_1 = require("./routes");
const app = (0, express_1.default)();
const PORT = process.env.ADMIN_API_PORT || 3009;
// Allow CORS from localhost origins
app.use((0, cors_1.default)({
    origin: [
        'http://localhost:8080',
        'http://127.0.0.1:8080',
        'http://localhost:8081',
        'http://127.0.0.1:8081',
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express_1.default.json());
// Register all routes
(0, routes_1.registerRoutes)(app);
// Initialize database connection
const initDb = async () => {
    try {
        const result = await (0, db_1.testConnection)();
        if (result.connected) {
            stdLogger_1.stdLogger.info(`Database connection established: ${result.timestamp}`);
        }
        else {
            stdLogger_1.stdLogger.error(`Failed to connect to database: ${result.error}`);
        }
    }
    catch (error) {
        stdLogger_1.stdLogger.error('Database initialization error:', { error });
    }
};
// Start the server
const server = app.listen(PORT, async () => {
    stdLogger_1.stdLogger.info(`Admin API server running at http://localhost:${PORT}`);
    stdLogger_1.stdLogger.info(`Registry available at http://localhost:${PORT}/api/registry`);
    // Initialize database connection after server starts
    await initDb();
});
// Implement graceful shutdown
const gracefulShutdown = async (signal) => {
    stdLogger_1.stdLogger.info(`${signal} received. Starting graceful shutdown...`);
    // Close the server first to stop accepting new connections
    server.close(() => {
        stdLogger_1.stdLogger.info('HTTP server closed');
        // Then close the database pool
        db_1.default.end().then(() => {
            stdLogger_1.stdLogger.info('Database connections closed');
            process.exit(0);
        }).catch(err => {
            stdLogger_1.stdLogger.error('Error closing database connections:', { error: err });
            process.exit(1);
        });
    });
    // Force shutdown after 10 seconds if graceful shutdown fails
    setTimeout(() => {
        stdLogger_1.stdLogger.error('Graceful shutdown timed out, forcing exit');
        process.exit(1);
    }, 10000);
};
// Listen for termination signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
exports.default = app;
//# sourceMappingURL=index.js.map
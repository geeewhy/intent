import * as dotenv from 'dotenv';
import { setLoggerAccessor, log } from '../../core/logger';
import { testLogger } from '../logger/testLogger';

// Load environment variables from .env file
dotenv.config();

// Set up the test logger for all integration tests
setLoggerAccessor(() => testLogger);

log()?.info('Environment variables loaded');
log()?.info('Test tenant ID configured', {
    tenantId: process.env.TEST_TENANT_ID
});

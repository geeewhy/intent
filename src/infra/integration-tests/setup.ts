import * as dotenv from 'dotenv';
import { setLoggerAccessor } from '../../core/logger';
import { testLogger } from '../logger/testLogger';

// Load environment variables from .env file
dotenv.config();

// Set up the test logger for all integration tests
setLoggerAccessor(() => testLogger);

console.log('Environment variables loaded from .env file');
console.log('TEST_TENANT_ID:', process.env.TEST_TENANT_ID);

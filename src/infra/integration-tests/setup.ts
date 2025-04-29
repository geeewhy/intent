import * as dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

console.log('Environment variables loaded from .env file');
console.log('TEST_TENANT_ID:', process.env.TEST_TENANT_ID);
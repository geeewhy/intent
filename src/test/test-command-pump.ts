/**
 * Test script for the command-pump worker
 * 
 * This script inserts a command into the database and checks if the command-pump worker processes it.
 * 
 * Usage:
 * 1. Start the command-pump worker in one terminal: npm run dev:command-pump
 * 2. Run this script in another terminal: npx ts-node src/test/test-command-pump.ts
 */

import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';

async function testCommandPump() {
  console.log('Testing command-pump worker...');

  // Create a PostgreSQL client
  const pool = new Pool({
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT || '5432'),
    user: process.env.POSTGRES_USER || 'postgres',
    password: process.env.POSTGRES_PASSWORD || 'postgres',
    database: process.env.POSTGRES_DB || 'kitcheneats',
  });

  try {
    // Generate a test tenant ID and command ID
    const tenantId = uuidv4();
    const commandId = uuidv4();
    
    console.log(`Using test tenant ID: ${tenantId}`);
    console.log(`Using test command ID: ${commandId}`);

    // Create a test command
    const command = {
      id: commandId,
      tenant_id: tenantId,
      type: 'createOrder',
      payload: {
        orderId: uuidv4(),
        userId: 'test-user',
        items: [
          {
            menuItemId: 'test-menu-item',
            quantity: 1,
            specialInstructions: 'Test order'
          }
        ],
        scheduledFor: new Date(Date.now() + 60 * 60 * 1000) // 1 hour from now
      },
      created_at: new Date().toISOString(),
      status: 'pending'
    };

    // Insert the command into the database
    console.log('Inserting test command into database...');
    await pool.query(`
      INSERT INTO commands (id, tenant_id, type, payload, created_at, status)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [
      command.id,
      command.tenant_id,
      command.type,
      JSON.stringify(command.payload),
      command.created_at,
      command.status
    ]);

    console.log('Test command inserted successfully.');
    console.log('Waiting for command-pump worker to process the command...');

    // Wait for the command-pump worker to process the command
    let processed = false;
    let attempts = 0;
    const maxAttempts = 10;

    while (!processed && attempts < maxAttempts) {
      // Check if the command has been processed
      const result = await pool.query(`
        SELECT status FROM commands WHERE id = $1
      `, [command.id]);

      if (result.rows.length > 0 && result.rows[0].status === 'consumed') {
        processed = true;
        console.log('Command has been processed successfully!');
      } else {
        attempts++;
        console.log(`Waiting... (attempt ${attempts}/${maxAttempts})`);
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
      }
    }

    if (!processed) {
      console.error('Command was not processed within the expected time.');
      console.error('Make sure the command-pump worker is running.');
    }
  } catch (error) {
    console.error('Error testing command-pump worker:', error);
  } finally {
    // Close the database connection
    await pool.end();
  }
}

// Run the test
testCommandPump().catch(console.error);
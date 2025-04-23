/**
 * Command-pump worker
 *
 * Listens for new commands via Supabase real-time API and starts Temporal workflows
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Command } from '../../domain/contracts';
import { TemporalScheduler } from '../temporal/temporal-scheduler';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

/**
 * Command-pump worker
 */
export class CommandPump {
  private supabase: SupabaseClient;
  private scheduler: TemporalScheduler;
  private isRunning: boolean = false;
  private subscription: any = null;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private healthy: boolean = false;

  // Command batching properties
  private batchSize: number = 1;
  private processingBatch: boolean = false;
  private commandQueue: Command[] = [];

  // Metrics properties
  private processedCommands: number = 0;
  private failedCommands: number = 0;
  private startTime: number = Date.now();

  /**
   * Constructor
   */
  constructor(config?: { supabaseUrl?: string; supabaseKey?: string }) {
    // Use the service role key instead of anon key for backend services
    const supabaseUrl = config?.supabaseUrl || process.env.SUPABASE_URL || '';
    const supabaseKey = config?.supabaseKey || process.env.SUPABASE_SERVICE_ROLE_KEY || '';

    console.log(`[CommandPump] Initializing with Supabase URL: ${supabaseUrl ? supabaseUrl.substring(0, 16) + '...' : 'undefined'}`);

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('[CommandPump] Supabase URL and service role key are required. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables in your .env file.');
    }

    // Initialize Supabase client with more detailed options and explicitly set headers
    this.supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false, // No need to refresh with service role
      },
      global: {
        headers: {
          // Set header to identify this as a service and bypass RLS
          'x-supabase-auth-role': 'service_role'
        }
      },
      realtime: {
        params: {
          eventsPerSecond: 10,
        }
      },
    });

    this.scheduler = new TemporalScheduler();

    // Set up metrics logging every 5 minutes
    setInterval(() => this.logMetrics(), 5 * 60 * 1000);
  }

  /**
   * Start listening for new commands
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('[CommandPump] Already running');
      return;
    }

    this.isRunning = true;
    console.log('[CommandPump] Starting command pump worker with Supabase real-time API');

    try {
      // Simple health check that avoids complex policy evaluation
      const { error: healthCheckError } = await this.supabase
          .from('commands')
          .select('id')
          .limit(1);

      if (healthCheckError) {
        console.error('[CommandPump] Database connection check failed:', healthCheckError.message);
        throw new Error(`Database connectivity issue: ${healthCheckError.message}`);
      }

      console.log('[CommandPump] Database connection verified successfully');
      this.healthy = true;

      // Set up the real-time subscription to the commands table
      const channel = this.supabase
          .channel('commands-channel')
          .on('postgres_changes',
              {
                event: 'INSERT',
                schema: 'public',
                table: 'commands',
                filter: 'status=eq.pending'
              },
              async (payload) => {
                try {
                  const cmd = payload.new as Command;
                  console.log(`[CommandPump] Received new command: ${JSON.stringify(cmd)}`);

                  // Only process if status is pending
                  if (cmd.status !== 'pending') {
                    console.log(`[CommandPump] Skipping non-pending command: ${cmd.id}, status: ${cmd.status}`);
                    return;
                  }

                  // Validate command
                  if (!this.validateCommand(cmd)) {
                    await this.markCommandAsConsumed(cmd.id, new Error('Invalid command structure or payload'));
                    this.failedCommands++;
                    return;
                  }
                  console.log(`[CommandPump] Processing command: ${cmd.id}, type: ${cmd.type}, tenant: ${cmd.tenant_id}`);
                  // Add to command queue for batch processing
                  this.commandQueue.push(cmd);
                  if (this.commandQueue.length >= this.batchSize) {
                    console.log("[CommandPump] Command queue size reached batch size, processing batch");
                    this.processBatch();
                  }
                } catch (error) {
                  console.error('[CommandPump] Error processing command:', error);
                  this.failedCommands++;
                }
              }
          )
          .subscribe((status, err) => {
            console.log(`[CommandPump] Subscription status: ${status}${err ? `, Error: ${err.message}` : ''}`);

            if (status === 'SUBSCRIBED') {
              this.reconnectAttempts = 0; // Reset counter on successful connection
            } else if (status === 'CHANNEL_ERROR') {
              this.healthy = false;
              this.handleDisconnect();
            } else if (status === 'TIMED_OUT') {
              this.healthy = false;
              this.handleDisconnect();
            } else if (status === 'CLOSED') {
              if (this.isRunning) {
                this.healthy = false;
                this.handleDisconnect();
              }
            }
          });

      this.subscription = channel;

      // Set up a heartbeat to keep the connection alive
      const heartbeatInterval = setInterval(() => {
        if (!this.isRunning) {
          clearInterval(heartbeatInterval);
          return;
        }

        // Simple query to verify database connectivity (no aggregation)
        // Use Promise.resolve() to ensure we have a full Promise implementation
        Promise.resolve(
            this.supabase.from('commands').select('id').limit(1)
        )
            .then(({ error }) => {
              if (error) {
                console.error('[CommandPump] Error in heartbeat query:', error.message);
                this.healthy = false;
                this.handleDisconnect();
              }
            })
            .catch((error: Error) => {
              console.error('[CommandPump] Error in heartbeat:', error);
              this.healthy = false;
              this.handleDisconnect();
            });
      }, 30000); // Every 30 seconds

      // Handle process termination
      process.on('SIGINT', async () => {
        clearInterval(heartbeatInterval);
        await this.stop();
        process.exit(0);
      });

      // Add more graceful shutdown handling
      process.on('SIGTERM', async () => {
        console.log('[CommandPump] Received SIGTERM, shutting down gracefully');
        this.healthy = false;

        // Wait for in-flight commands to complete (up to 10 seconds)
        const shutdownTimeout = setTimeout(() => {
          console.log('[CommandPump] Shutdown timeout reached, forcing exit');
          process.exit(1);
        }, 10000);

        await this.stop();
        clearTimeout(shutdownTimeout);
        process.exit(0);
      });

      console.log('[CommandPump] Listening for new commands');
    } catch (error) {
      console.error('[CommandPump] Error starting command pump:', error);
      this.isRunning = false;
      this.healthy = false;

      // Try to restart with exponential backoff
      const backoffTime = Math.min(5000 * Math.pow(2, this.reconnectAttempts), 60000);
      this.reconnectAttempts++;

      if (this.reconnectAttempts <= this.maxReconnectAttempts) {
        console.log(`[CommandPump] Attempting reconnect ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${backoffTime/1000} seconds...`);
        setTimeout(() => this.start(), backoffTime);
      } else {
        console.error(`[CommandPump] Maximum reconnection attempts (${this.maxReconnectAttempts}) reached. Giving up.`);
      }
    }
  }

  /**
   * Handle disconnection and reconnection logic
   */
  private handleDisconnect(): void {
    console.log('[CommandPump] Handling disconnection...');
    this.isRunning = false;

    if (this.subscription) {
      this.supabase.removeChannel(this.subscription);
      this.subscription = null;
    }

    // Try to restart with exponential backoff
    const backoffTime = Math.min(5000 * Math.pow(2, this.reconnectAttempts), 60000);
    this.reconnectAttempts++;

    if (this.reconnectAttempts <= this.maxReconnectAttempts) {
      console.log(`[CommandPump] Attempting reconnect ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${backoffTime/1000} seconds...`);
      setTimeout(() => this.start(), backoffTime);
    } else {
      console.error(`[CommandPump] Maximum reconnection attempts (${this.maxReconnectAttempts}) reached. Giving up.`);
    }
  }

  /**
   * Mark a command as consumed (workflow started)
   */
  private async markCommandAsConsumed(commandId: string, error?: Error): Promise<void> {
    try {
      const updateData = error
          ? {
            status: 'failed',
            error_message: error.message,
            updated_at: new Date().toISOString()
          }
          : {
            status: 'consumed',
            updated_at: new Date().toISOString()
          };

      const { error: dbError } = await this.supabase
          .from('commands')
          .update(updateData)
          .eq('id', commandId);

      if (dbError) {
        throw dbError;
      }
    } catch (error) {
      console.error(`[CommandPump] Error updating command ${commandId}:`, error);
    }
  }

  /**
   * Process a batch of commands
   */
  private async processBatch(): Promise<void> {
    if (this.processingBatch || this.commandQueue.length === 0) {
      return;
    }

    this.processingBatch = true;

    try {
      console.log(`[CommandPump] Processing batch of ${this.commandQueue.length} commands`);

      const batchToProcess = this.commandQueue.splice(0, this.batchSize);

      for (const cmd of batchToProcess) {
        const processingTimeout = setTimeout(() => {
          console.error(`[CommandPump] Processing timeout for command: ${cmd.id}`);
          this.markCommandAsConsumed(cmd.id, new Error('Processing timeout exceeded'));
          this.failedCommands++;
        }, 30000); // 30 second timeout

        try {
          await this.scheduler.schedule(cmd);
          await this.markCommandAsConsumed(cmd.id);
          this.processedCommands++;
          clearTimeout(processingTimeout);
        } catch (error) {
          clearTimeout(processingTimeout);
          console.error(`[CommandPump] Error processing command in batch: ${cmd.id}`, error);
          await this.markCommandAsConsumed(cmd.id, error as Error);
          this.failedCommands++;
        }
      }
    } finally {
      this.processingBatch = false;

      // Process next batch if there are more commands
      if (this.commandQueue.length > 0) {
        await this.processBatch();
      }
    }
  }

  /**
   * Validate command structure and payload
   */
  private validateCommand(cmd: Command): boolean {
    if (!cmd.id || !cmd.type || !cmd.tenant_id) {
      console.error(`[CommandPump] Invalid command structure: ${JSON.stringify(cmd)}`);
      return false;
    }

    // Add validation for required command payload based on type
    switch (cmd.type) {
      case 'createOrder':
        const payload = cmd.payload as any;
        if (!payload.orderId || !payload.userId || !payload.items) {
          console.error(`[CommandPump] Invalid createOrder payload: ${JSON.stringify(payload)}`);
          return false;
        }
        break;
        // Add other command type validations as needed
    }

    return true;
  }

  /**
   * Log metrics for monitoring
   */
  private logMetrics(): void {
    const uptime = Math.floor((Date.now() - this.startTime) / 1000);
    console.log(`[CommandPump] Metrics - Uptime: ${uptime}s, Processed: ${this.processedCommands}, Failed: ${this.failedCommands}`);
  }

  /**
   * Health check method
   */
  public isHealthy(): boolean {
    return this.healthy && this.isRunning;
  }

  /**
   * Stop listening for new commands
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    console.log('[CommandPump] Stopping command pump worker');
    this.isRunning = false;
    this.healthy = false;

    if (this.subscription) {
      this.supabase.removeChannel(this.subscription);
      this.subscription = null;
    }

    console.log('[CommandPump] Stopped command pump worker');
  }
}

/**
 * Start the command pump worker
 */
if (require.main === module) {
  const pump = new CommandPump();
  pump.start().catch(error => {
    console.error('[CommandPump] Fatal error:', error);
    process.exit(1);
  });
}
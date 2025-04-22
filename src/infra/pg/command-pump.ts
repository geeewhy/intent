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

    console.log('[CommandPump] Initialized with Supabase client (service role)');
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

                  console.log(`[CommandPump] Processing command: ${cmd.id}, type: ${cmd.type}`);

                  console.log("Command is...", cmd);
                  // Start a Temporal workflow for the command
                  await this.scheduler.schedule(cmd);

                  // Mark the command as consumed
                  await this.markCommandAsConsumed(cmd.id);

                  console.log(`[CommandPump] Command consumed: ${cmd.id}, type: ${cmd.type}`);
                } catch (error) {
                  console.error('[CommandPump] Error processing command:', error);
                }
              }
          )
          .subscribe((status, err) => {
            console.log(`[CommandPump] Subscription status: ${status}${err ? `, Error: ${err.message}` : ''}`);

            if (status === 'SUBSCRIBED') {
              console.log('[CommandPump] Successfully subscribed to commands table changes');
              this.reconnectAttempts = 0; // Reset counter on successful connection
            } else if (status === 'CHANNEL_ERROR') {
              console.error('[CommandPump] Error subscribing to commands table changes', err);
              this.handleDisconnect();
            } else if (status === 'TIMED_OUT') {
              console.error('[CommandPump] Subscription timed out');
              this.handleDisconnect();
            } else if (status === 'CLOSED') {
              console.log('[CommandPump] Channel closed');
              if (this.isRunning) {
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

        console.log('[CommandPump] Sending heartbeat...');

        // Simple query to verify database connectivity (no aggregation)
        // Use Promise.resolve() to ensure we have a full Promise implementation
        Promise.resolve(
            this.supabase.from('commands').select('id').limit(1)
        )
            .then(({ error }) => {
              if (error) {
                console.error('[CommandPump] Error in heartbeat query:', error.message);
                this.handleDisconnect();
              } else {
                console.log('[CommandPump] Heartbeat successful');
              }
            })
            .catch((error: Error) => {
              console.error('[CommandPump] Error in heartbeat:', error);
              this.handleDisconnect();
            });
      }, 30000); // Every 30 seconds

      // Handle process termination
      process.on('SIGINT', async () => {
        clearInterval(heartbeatInterval);
        await this.stop();
        process.exit(0);
      });

      console.log('[CommandPump] Listening for new commands');
    } catch (error) {
      console.error('[CommandPump] Error starting command pump:', error);
      this.isRunning = false;

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
   * Mark a command as consumed
   */
  private async markCommandAsConsumed(commandId: string): Promise<void> {
    try {
      const { error } = await this.supabase
          .from('commands')
          .update({
            status: 'consumed',
            updated_at: new Date().toISOString()
          })
          .eq('id', commandId);

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error(`[CommandPump] Error marking command as consumed: ${commandId}`, error);
    }
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
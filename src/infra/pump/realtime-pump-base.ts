/**
 * Generic pump for Supabase real-time events
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

/**
 * Pump configuration
 */
export interface PumpConfig<Row> {
  /** Supabase channel name */
  channel: string;
  /** postgres_changes filter */
  eventSpec: {
    event: 'INSERT';
    schema: string;
    table: string;
    filter?: string; // e.g. 'status=eq.pending'
  };
  /** Batch size for processing (default 50) */
  batchSize?: number;
  /** Fast reject rows we don't want */
  validate: (row: Row) => boolean;
  /** Process an array of rows (batch) */
  processBatch: (rows: Row[]) => Promise<void>;
}

/**
 * Generic real-time pump base class
 */
export class RealtimePumpBase<Row = any> {
  private sb: SupabaseClient;
  private queue: Row[] = [];
  private draining: boolean = false;

  /**
   * Constructor
   * @param cfg Pump configuration
   */
  constructor(private cfg: PumpConfig<Row>) {
    const url = process.env.SUPABASE_URL!;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    if (!url || !key) {
      throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables are required');
    }

    this.sb = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { 'x-supabase-auth-role': 'service_role' } },
      realtime: { params: { eventsPerSecond: 20 } }
    });
  }

  /**
   * Start the pump
   */
  async start(): Promise<void> {
    console.log(`[Pump] start ${this.cfg.channel}`);

    await this.sb.channel(this.cfg.channel)
      .on('postgres_changes' as any, this.cfg.eventSpec, (payload: { new: any }) => {
        console.log('NEW ROW',payload.new.id);
        const row = payload.new;
        if (row && this.cfg.validate(row)) {
          this.queue.push(row as Row);
        }
      })
      .subscribe((status, err) => {
        console.log(`[Pump] ${this.cfg.channel} status=${status}`, err?.message ? err.message : '[NO ERROR]');
      });

    // Drain loop
    setInterval(() => this.drain(), 25); // ~40 Hz
  }

  /**
   * Drain the queue
   */
  private async drain(): Promise<void> {
    if (this.draining || this.queue.length === 0) {
      return;
    }

    this.draining = true;

    try {
      const batchSize = this.cfg.batchSize ?? 50;
      const batch = this.queue.splice(0, batchSize);

      await this.cfg.processBatch(batch);
    } catch (e) {
      console.error('[Pump] batch error', e);
    } finally {
      this.draining = false;
    }
  }
}

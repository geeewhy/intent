//command-pump.ts
/**
 * Command pump implementation
 * Listens for new commands and schedules workflows
 */

import { RealtimePumpBase } from './realtime-pump-base';
import { Command } from '../../core/contracts';
import { markConsumed, markFailed } from './helpers/command-helpers';
import { Scheduler } from '../temporal/scheduler';

/**
 * Start the command pump
 */
export async function startCommandPump() {
  console.log('[CommandPump] Starting command pump');

  const scheduler = await Scheduler.create();

  console.log('[CommandPump] Temporal scheduler created');

  new RealtimePumpBase<Command>({
    channel: 'commands-pump',
    eventSpec: {
      event: 'INSERT',
      schema: 'core',
      table: 'commands',
      filter: 'status=eq.pending'
    },
    batchSize: 1,
    validate: cmd => cmd && cmd.status === 'pending' && !!cmd.type,
    processBatch: async commands => {
      console.log(`[CommandPump] Processing batch of ${commands.length} commands`);

      for (const cmd of commands) {
        try {
          console.log(`[CommandPump] Scheduling workflow for command: ${cmd.id}, type: ${cmd.type}`);
          await scheduler.schedule(cmd);
          console.log(`[CommandPump] Command sent to schedule: ${cmd.id}`);
        } catch (error) {
          console.error(`[CommandPump] Error processing command: ${cmd.id}`, error);
          await markFailed(cmd.id, error as Error);
        }
      }
    }
  }).start().catch(error => {
    console.error('[CommandPump] Fatal error starting command pump:', error);
    process.exit(1);
  });
}

// Start the command pump if this file is run directly
(async () => {
  try {
    await startCommandPump();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();

"use strict";
//command-pump.ts
/**
 * Command pump implementation
 * Listens for new commands and schedules workflows
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.startCommandPump = startCommandPump;
const realtime_pump_base_1 = require("./realtime-pump-base");
const command_helpers_1 = require("./helpers/command-helpers");
const scheduler_1 = require("../temporal/scheduler");
/**
 * Start the command pump
 */
async function startCommandPump() {
    console.log('[CommandPump] Starting command pump');
    const scheduler = await scheduler_1.Scheduler.create();
    console.log('[CommandPump] Temporal scheduler created');
    new realtime_pump_base_1.RealtimePumpBase({
        channel: 'commands-pump',
        eventSpec: {
            event: 'INSERT',
            schema: 'core',
            table: 'commands',
            filter: 'status=eq.pending'
        },
        batchSize: 1,
        validate: cmd => cmd && cmd.status === 'pending' && !!cmd.type,
        processBatch: async (commands) => {
            console.log(`[CommandPump] Processing batch of ${commands.length} commands`);
            for (const cmd of commands) {
                try {
                    console.log(`[CommandPump] Scheduling workflow for command: ${cmd.id}, type: ${cmd.type}`);
                    await scheduler.schedule(cmd);
                    console.log(`[CommandPump] Command sent to schedule: ${cmd.id}`);
                }
                catch (error) {
                    console.error(`[CommandPump] Error processing command: ${cmd.id}`, error);
                    await (0, command_helpers_1.markFailed)(cmd.id, error);
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
    }
    catch (err) {
        console.error(err);
        process.exit(1);
    }
})();
//# sourceMappingURL=command-pump.js.map
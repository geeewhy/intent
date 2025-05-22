//command-helpers.ts
/**
 * Command helpers for pump workers
 */

import { sbAdmin } from './supabase-client';
import {CommandResult} from "../../contracts";

/**
 * Mark a command as consumed (workflow started)
 * @param id The command ID
 */
export const markConsumed = (id: string, res:CommandResult) =>
  sbAdmin.from('infra.commands').update({ status: res.status }).eq('id', id);

/**
 * Mark a command as failed
 * @param id The command ID
 * @param err The error that occurred
 */
export const markFailed = (id: string, err: Error) =>
  sbAdmin.from('infra.commands').update({
    status: 'failed', 
    error_message: err.message
  }).eq('id', id);

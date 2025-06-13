/**
 * Command helpers for pump workers
 */
import { CommandResult } from "../../contracts";
/**
 * Mark a command as consumed (workflow started)
 * @param id The command ID
 */
export declare const markConsumed: (id: string, res: CommandResult) => import("@supabase/postgrest-js").PostgrestFilterBuilder<any, any, null, "infra.commands", unknown>;
/**
 * Mark a command as failed
 * @param id The command ID
 * @param err The error that occurred
 */
export declare const markFailed: (id: string, err: Error) => import("@supabase/postgrest-js").PostgrestFilterBuilder<any, any, null, "infra.commands", unknown>;

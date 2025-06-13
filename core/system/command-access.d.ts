import { SystemRole } from './contracts';
export declare enum SystemAccessCustomConditions {
    CAN_TRIGGER_FAILURE = "system.canTriggerFailure",
    CAN_EMIT_EVENTS = "system.canEmitEvents",
    CAN_EXECUTE_TEST = "system.canExecuteTest"
}
export declare const systemCommandAccessModel: Record<SystemRole, string[]>;
export declare const autoRegisteredCommandAccessConditions: Set<string>;
type ExtractedCommandConditions<T extends Record<string, string[]>> = T[keyof T][number] extends infer Cmd ? `system.canExecute.${Extract<Cmd, string>}` : never;
export type ExtractedSystemCommandCondition = ExtractedCommandConditions<typeof systemCommandAccessModel>;
export type SystemCommandAccessCondition = SystemAccessCustomConditions | ExtractedSystemCommandCondition;
declare const allCommands: readonly string[];
export declare const GeneratedSystemCommandConditions: { [K in Uppercase<(typeof allCommands)[number]>]: `system.canExecute.${(typeof allCommands)[number]}`; };
export {};

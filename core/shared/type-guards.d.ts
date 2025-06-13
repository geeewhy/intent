import { Command, Event } from '../contracts';
export declare function isCommand(input: any): input is Command;
export declare function isEvent(input: any): input is Event;
export declare function isCommandType(input: any, type: string): boolean;
export declare function assertDataPropsMatchMapKeys<T extends object>(data: T, map: any): boolean;
export type PgTypeToTs<T extends string> = T extends 'uuid' ? string : T extends 'text' ? string : T extends 'integer' ? number : T extends 'timestamp' ? Date | string : T extends 'jsonb' ? object : any;

import { type Activator } from './internals';
export declare function maybeGetActivatorUntyped(): unknown;
export declare function setActivatorUntyped(activator: unknown): void;
export declare function maybeGetActivator(): Activator | undefined;
export declare function assertInWorkflowContext(message: string): Activator;
export declare function getActivator(): Activator;

import type { Command, Event } from '../../../core/contracts';
/**
 * Main saga processor workflow
 */
export declare function processSaga(initialInput: Command | Event): Promise<void>;

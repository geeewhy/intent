import { Event } from "../core/contracts";
export type CommandResult = {
    status: 'success' | 'fail';
    events?: Event[];
    error?: Error;
};

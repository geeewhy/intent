import { CommandHandler } from '../contracts';
import { Command, Event } from '../contracts';
import { BaseAggregate } from '../base/aggregate';
export declare class SystemCommandHandler implements CommandHandler<Command<any>> {
    supportsCommand(cmd: Command): boolean;
    handleWithAggregate(cmd: Command<any>, aggregate: BaseAggregate<any>): Promise<Event<any>[]>;
}

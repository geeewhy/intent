//src/core/system/command-handler.ts
import { CommandHandler } from '../contracts';
import { Command, Event } from '../contracts';
import { BaseAggregate } from '../base/aggregate';
import { SystemAggregate } from './aggregates/system.aggregate';
import {SystemCommandType} from "./contracts";

export class SystemCommandHandler implements CommandHandler<Command<any>> {
    supportsCommand(cmd: Command): boolean {
        return Object.values(SystemCommandType).includes(cmd.type as SystemCommandType);
    }

    async handleWithAggregate(cmd: Command<any>, aggregate: BaseAggregate<any>): Promise<Event<any>[]> {
        if (!(aggregate instanceof SystemAggregate)) {
            throw new Error(`Expected SystemAggregate but got ${aggregate.constructor.name} for cmd: ${cmd.type}`);
        }
        return aggregate.handle(cmd);
    }
}

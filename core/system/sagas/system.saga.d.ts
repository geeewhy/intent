import { Command, Event, ProcessPlan, SagaContext } from '../../contracts';
export declare class SystemSaga {
    static readonly sagaName: string;
    static reactsTo(): string[];
    static react(input: Command | Event, ctx: SagaContext): Promise<ProcessPlan>;
}

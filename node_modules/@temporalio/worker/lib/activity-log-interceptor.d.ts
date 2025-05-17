import { Context } from '@temporalio/activity';
import { ActivityInboundCallsInterceptor, ActivityExecuteInput, Next } from './interceptors';
import { Logger } from './logger';
/**
 * This interceptor was previously used to log Activity execution starts and their completions. It is now deprecated
 * and behaves as a noop in most cases. It is only kept arround to avoid breaking code out there that was previously
 * refering to it.
 *
 * @deprecated `ActivityInboundLogInterceptor` is deprecated. Activity lifecycle events are now automatically logged
 *             by the SDK. To customize activity log attributes, register a custom {@link ActivityOutboundCallsInterceptor}
 *             that intercepts the `getLogAttributes()` method. To customize where log messages are sent, set the
 *             {@link Runtime.logger} property.
 */
export declare class ActivityInboundLogInterceptor implements ActivityInboundCallsInterceptor {
    protected readonly ctx: Context;
    protected readonly logger: Logger;
    constructor(ctx: Context, logger?: Logger | undefined);
    protected logAttributes(): Record<string, unknown>;
    execute(input: ActivityExecuteInput, next: Next<ActivityInboundCallsInterceptor, 'execute'>): Promise<unknown>;
}

import { Command, Event, Metadata } from '../contracts';
export declare function inheritMetadata(input: Command | Event, ctx: {
    getHint?<T>(key: string): T | undefined;
}, extendMetadata?: Partial<Metadata>): Metadata;

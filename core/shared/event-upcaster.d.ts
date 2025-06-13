type UpcasterFn = (payload: any) => any;
interface UpcasterRegistry {
    [eventType: string]: {
        [fromSchemaVersion: number]: UpcasterFn;
    };
}
export declare const eventUpcasters: UpcasterRegistry;
export declare function registerEventUpcaster(eventType: string, fromSchemaVersion: number, upcaster: UpcasterFn): void;
export declare function upcastEvent(eventType: string, payload: any, schemaVersion: number): any;
export {};

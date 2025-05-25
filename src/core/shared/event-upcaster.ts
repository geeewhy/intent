// src/core/shared/event-upcaster.ts
type UpcasterFn = (payload: any) => any;

interface UpcasterRegistry {
    [eventType: string]: {
        [fromSchemaVersion: number]: UpcasterFn;
    };
}

export const eventUpcasters: UpcasterRegistry = {};

export function registerEventUpcaster(
    eventType: string,
    fromSchemaVersion: number,
    upcaster: UpcasterFn
) {
    eventUpcasters[eventType] ??= {};
    eventUpcasters[eventType][fromSchemaVersion] = upcaster;
}

export function upcastEvent(
    eventType: string,
    payload: any,
    schemaVersion: number
): any {
    const upcaster = eventUpcasters[eventType]?.[schemaVersion];
    return upcaster ? upcaster(payload) : payload;
}

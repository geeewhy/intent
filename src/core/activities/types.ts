// core/activities/types.ts
export interface DomainActivities {
    generateUUID(): Promise<string>;
}
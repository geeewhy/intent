//src/core/policy-registry.ts
const conditionMap: Record<string, (args: any) => boolean | Promise<boolean>> = {};

export function registerCondition(name: string, fn: (args: any) => boolean | Promise<boolean>) {
    if (conditionMap[name]) {
        throw new Error(`Condition ${name} is already registered`);
    }
    conditionMap[name] = fn;
}

export async function evaluateCondition(name: string, args: any): Promise<boolean> {
    const fn = conditionMap[name];
    if (!fn) throw new Error(`Unknown condition: ${name}`);
    return await fn(args);
}

export function listRegisteredConditions() {
    return Object.keys(conditionMap).sort();
}
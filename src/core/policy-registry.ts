//src/core/policy-registry.ts
import { AccessContext } from './contracts';

export type AccessPolicy = (context: AccessContext) => boolean;
const conditionMap: Record<string, (args: AccessPolicy) => boolean> = {};

export function registerCondition(name: string, fn: (args: any) => boolean) {
    if (conditionMap[name]) {
        throw new Error(`Condition ${name} is already registered`);
    }
    conditionMap[name] = fn;
}

export function evaluateCondition(name: string, args: any): boolean {
    const fn = conditionMap[name];
    if (!fn) throw new Error(`Unknown condition: ${name}, conditions available: ${listRegisteredConditions().join(', ')}`);
    return fn(args);
}

export function listRegisteredConditions() {
    return Object.keys(conditionMap).sort();
}

type RoleAccessMap = Record<string, string[]>;

export function registerCommandConditionsFromModel(
    namespace: string,
    model: RoleAccessMap
) {
    const registeredConditions = new Set<string>();

    Object.values(model).flat().forEach((cmd) => {
        const condition = `${namespace}.canExecute.${cmd}`;
        if (registeredConditions.has(condition)) return;

        registeredConditions.add(condition);

        registerCondition(condition, ({ role }: AccessContext) =>
            model[role]?.includes(cmd)
        );
    });
    return registeredConditions;
}

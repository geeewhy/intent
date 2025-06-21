//src/core/policy-registry.ts
import { AccessContext } from './contracts';

const conditionMap: Record<string, (ctx: AccessContext) => boolean> = {};

export function registerCondition(name: string, fn: (args: AccessContext) => boolean) {
    if (conditionMap[name]) {
        throw new Error(`Condition ${name} is already registered`);
    }
    conditionMap[name] = fn;
}

export function evaluateCondition(name: string, args: AccessContext): boolean {
    const fn = conditionMap[name];
    if (!fn) throw new Error(`Unknown condition: ${name}, conditions available: ${listRegisteredConditions().join(', ')}`);
    return fn(args);
}

export function isCommandAllowed(
    condition: string,
    context: AccessContext
) {
    return evaluateCondition(condition, context);
}

export function listRegisteredConditions() {
    return Object.keys(conditionMap).sort();
}

export function getConditionMap(): Record<string, (args: any) => boolean> {
    return { ...conditionMap }; // read-only clone
}

type RoleAccessMap = Record<string, string[]>;
export const RegisteredAccessModels: Record<string, RoleAccessMap> = {};

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

    RegisteredAccessModels[namespace] = model;

    return registeredConditions;
}

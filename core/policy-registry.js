"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RegisteredAccessModels = void 0;
exports.registerCondition = registerCondition;
exports.evaluateCondition = evaluateCondition;
exports.isCommandAllowed = isCommandAllowed;
exports.listRegisteredConditions = listRegisteredConditions;
exports.getConditionMap = getConditionMap;
exports.registerCommandConditionsFromModel = registerCommandConditionsFromModel;
const conditionMap = {};
function registerCondition(name, fn) {
    if (conditionMap[name]) {
        throw new Error(`Condition ${name} is already registered`);
    }
    conditionMap[name] = fn;
}
function evaluateCondition(name, args) {
    const fn = conditionMap[name];
    if (!fn)
        throw new Error(`Unknown condition: ${name}, conditions available: ${listRegisteredConditions().join(', ')}`);
    return fn(args);
}
function isCommandAllowed(condition, context) {
    return evaluateCondition(condition, context);
}
function listRegisteredConditions() {
    return Object.keys(conditionMap).sort();
}
function getConditionMap() {
    return { ...conditionMap }; // read-only clone
}
exports.RegisteredAccessModels = {};
function registerCommandConditionsFromModel(namespace, model) {
    const registeredConditions = new Set();
    Object.values(model).flat().forEach((cmd) => {
        const condition = `${namespace}.canExecute.${cmd}`;
        if (registeredConditions.has(condition))
            return;
        registeredConditions.add(condition);
        registerCondition(condition, ({ role }) => model[role]?.includes(cmd));
    });
    exports.RegisteredAccessModels[namespace] = model;
    return registeredConditions;
}
//# sourceMappingURL=policy-registry.js.map
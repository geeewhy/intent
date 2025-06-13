"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.promptSelect = promptSelect;
exports.promptYesNo = promptYesNo;
exports.promptText = promptText;
exports.promptPassword = promptPassword;
//src/tools/setup/shared/prompt.ts
/**
 * Prompt utilities for interactive mode
 */
const prompts_1 = __importDefault(require("prompts"));
const onCancel = () => {
    console.error('Process terminated by user (Ctrl+C)');
    process.exit(1);
};
/**
 * Prompt for selecting an option from a list
 * @param message Prompt message
 * @param choices List of choices
 * @param defaultValue Default value (optional)
 * @returns Selected value
 */
async function promptSelect(message, choices, defaultValue) {
    const response = await (0, prompts_1.default)({
        type: 'select',
        name: 'value',
        message,
        choices: choices.map(choice => ({ title: choice, value: choice })),
        initial: defaultValue ? choices.indexOf(defaultValue) : 0
    }, { onCancel });
    return response.value;
}
/**
 * Prompt for yes/no confirmation
 * @param message Prompt message
 * @param defaultValue Default value (optional)
 * @returns True for yes, false for no
 */
async function promptYesNo(message, defaultValue = true) {
    const response = await (0, prompts_1.default)({
        type: 'confirm',
        name: 'value',
        message,
        initial: defaultValue
    }, { onCancel });
    return response.value;
}
/**
 * Prompt for text input
 * @param message Prompt message
 * @param defaultValue Default value (optional)
 * @param validator Validation function (optional)
 * @returns Entered text
 */
async function promptText(message, defaultValue = '', validator) {
    const response = await (0, prompts_1.default)({
        type: 'text',
        name: 'value',
        message,
        initial: defaultValue,
        validate: validator
    });
    return response.value;
}
/**
 * Prompt for password input (masked)
 * @param message Prompt message
 * @param validator Validation function (optional)
 * @returns Entered password
 */
async function promptPassword(message, validator) {
    const response = await (0, prompts_1.default)({
        type: 'password',
        name: 'value',
        message,
        validate: validator
    }, { onCancel });
    return response.value;
}
//# sourceMappingURL=prompt.js.map
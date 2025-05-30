//src/tools/setup/shared/prompt.ts
/**
 * Prompt utilities for interactive mode
 */
import prompts from 'prompts';

const onCancel = (): never => {
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
export async function promptSelect<T extends string>(
    message: string,
    choices: T[],
    defaultValue?: T
): Promise<T> {
    const response = await prompts({
        type: 'select',
        name: 'value',
        message,
        choices: choices.map(choice => ({title: choice, value: choice})),
        initial: defaultValue ? choices.indexOf(defaultValue) : 0
    }, {onCancel});

    return response.value;
}

/**
 * Prompt for yes/no confirmation
 * @param message Prompt message
 * @param defaultValue Default value (optional)
 * @returns True for yes, false for no
 */
export async function promptYesNo(
    message: string,
    defaultValue = true
): Promise<boolean> {
    const response = await prompts({
        type: 'confirm',
        name: 'value',
        message,
        initial: defaultValue
    }, {onCancel});

    return response.value;
}

/**
 * Prompt for text input
 * @param message Prompt message
 * @param defaultValue Default value (optional)
 * @param validator Validation function (optional)
 * @returns Entered text
 */
export async function promptText(
    message: string,
    defaultValue = '',
    validator?: (value: string) => string | boolean
): Promise<string> {
    const response = await prompts({
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
export async function promptPassword(
    message: string,
    validator?: (value: string) => string | boolean
): Promise<string> {
    const response = await prompts({
        type: 'password',
        name: 'value',
        message,
        validate: validator
    }, {onCancel});

    return response.value;
}

/**
 * Prompt for selecting an option from a list
 * @param message Prompt message
 * @param choices List of choices
 * @param defaultValue Default value (optional)
 * @returns Selected value
 */
export declare function promptSelect<T extends string>(message: string, choices: T[], defaultValue?: T): Promise<T>;
/**
 * Prompt for yes/no confirmation
 * @param message Prompt message
 * @param defaultValue Default value (optional)
 * @returns True for yes, false for no
 */
export declare function promptYesNo(message: string, defaultValue?: boolean): Promise<boolean>;
/**
 * Prompt for text input
 * @param message Prompt message
 * @param defaultValue Default value (optional)
 * @param validator Validation function (optional)
 * @returns Entered text
 */
export declare function promptText(message: string, defaultValue?: string, validator?: (value: string) => string | boolean): Promise<string>;
/**
 * Prompt for password input (masked)
 * @param message Prompt message
 * @param validator Validation function (optional)
 * @returns Entered password
 */
export declare function promptPassword(message: string, validator?: (value: string) => string | boolean): Promise<string>;

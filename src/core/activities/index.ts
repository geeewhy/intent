import crypto from 'crypto';

export async function generateUUID(): Promise<string> {
    return crypto.randomUUID();
}
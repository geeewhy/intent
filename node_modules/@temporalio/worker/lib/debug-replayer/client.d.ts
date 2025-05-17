import http from 'node:http';
interface ClientOptions {
    baseUrl: string;
}
/**
 * "High level" HTTP client, used to avoid adding more dependencies to the worker package.
 *
 * DO NOT use this in a real application, it's meant to only be used for calling a "runner" (e.g. VS Code debugger
 * extension).
 */
export declare class Client {
    readonly options: ClientOptions;
    constructor(options: ClientOptions);
    post(url: string, options: http.RequestOptions, body: Buffer): Promise<http.IncomingMessage>;
    get(url: string, options?: http.RequestOptions): Promise<http.IncomingMessage>;
    static readAll(response: http.IncomingMessage): Promise<Buffer>;
    static contentLength(response: http.IncomingMessage): number;
}
export {};

/**
 * This file contain helper functions to parse specific subsets of URIs.
 *
 * The ECMAScript-compliant URL class don't properly handle some syntaxes that
 * we care about, such as not providing a protocol (e.g. '127.0.0.1:7233'), and
 * performs some normalizations that are not desirable for our use cases
 * (e.g. parsing 'http://127.0.0.1:7233' adds a '/' path). On the other side,
 * simply using `split(':')` breaks on IPv6 addresses. Hence these helpers.
 */
export interface ProtoHostPort {
    scheme?: string;
    hostname: string;
    port?: number;
}
/**
 * Split a URI composed only of a scheme, a hostname, and port.
 * The scheme and port are optional.
 *
 * Examples of valid URIs for HTTP CONNECT proxies:
 *
 * ```
 * http://test.com:8080 => { scheme: 'http', host: 'test.com', port: 8080 }
 * http://192.168.0.1:8080 => { scheme: 'http', host: '192.168.0.1', port: 8080 }
 * [::1]:8080 => { scheme: 'http', host: '::1', port: 8080 }
 * [::ffff:192.0.2.128]:8080 => { scheme: 'http', host: '::ffff:192.0.2.128', port: 8080 }
 * 192.168.0.1:8080 => { scheme: 'http', host: '192.168.0.1', port: 8080 }
 * ```
 */
export declare function splitProtoHostPort(uri: string): ProtoHostPort | undefined;
export declare function joinProtoHostPort(components: ProtoHostPort): string;
/**
 * Parse the address for the gRPC endpoint of a Temporal server.
 *
 * - The URI may only contain a hostname and a port.
 * - Port is optional; if not specified, set it to `defaultPort`.
 *
 * Examples of valid URIs (assuming `defaultPort` is 7233):
 *
 * ```
 * 127.0.0.1 => { host: '127.0.0.1', port: 7233 }
 * 192.168.0.1:7233 => { host: '192.168.0.1', port: 7233 }
 * my.temporal.service.com:7233 => { host: 'my.temporal.service.com', port: 7233 }
 * [::ffff:192.0.2.128]:8080 => { host: '[::ffff:192.0.2.128]', port: 8080 }
 * ```
 */
export declare function normalizeGrpcEndpointAddress(uri: string, defaultPort: number): string;

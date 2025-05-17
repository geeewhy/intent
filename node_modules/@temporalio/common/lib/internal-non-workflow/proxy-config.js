"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseHttpConnectProxyAddress = parseHttpConnectProxyAddress;
const parse_host_uri_1 = require("./parse-host-uri");
/**
 * Parse the address of a HTTP CONNECT proxy endpoint.
 *
 * - The URI may only contain a scheme, a hostname, and a port;
 * - If specified, scheme must be 'http';
 * - Port is required.
 *
 * Examples of valid URIs:
 *
 * ```
 * 127.0.0.1:8080 => { scheme: 'http', host: '192.168.0.1', port: 8080 }
 * my.temporal.service.com:8888 => { scheme: 'http', host: 'my.temporal.service.com', port: 8888 }
 * [::ffff:192.0.2.128]:8080 => { scheme: 'http', host: '::ffff:192.0.2.128', port: 8080 }
 * ```
 */
function parseHttpConnectProxyAddress(target) {
    const match = (0, parse_host_uri_1.splitProtoHostPort)(target);
    if (!match)
        throw new TypeError(`Invalid address for HTTP CONNECT proxy: expected 'hostname:port' or '[ipv6 address]:port'; got '${target}'`);
    const { scheme = 'http', hostname: host, port } = match;
    if (scheme !== 'http')
        throw new TypeError(`Invalid address for HTTP CONNECT proxy: scheme must be http'; got '${target}'`);
    if (port === undefined)
        throw new TypeError(`Invalid address for HTTP CONNECT proxy: port is required; got '${target}'`);
    return { scheme, hostname: host, port };
}
//# sourceMappingURL=proxy-config.js.map
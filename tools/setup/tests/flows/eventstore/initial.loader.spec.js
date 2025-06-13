"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
//src/tools/setup/tests/flows/eventstore/initial.loader.spec.ts
/**
 * GIVEN the event-store flow, defaultProvider postgres and the
 * "initial" path declared in flow.yaml
 * WHEN loadFlow is invoked with no CLI overrides
 * THEN it should
 *   – resolve provider === 'postgres'
 *   – resolve pathName  === 'initial'
 *   – return exactly the three expected step files in order
 */
const node_path_1 = __importDefault(require("node:path"));
const loader_1 = require("../../../flows/loader");
describe('loader – eventstore initial', () => {
    const flowName = 'eventstore';
    // Use the same path resolution logic as getFlowsRoot in test environment
    const root = node_path_1.default.join(process.cwd(), 'src', 'tools', 'setup', 'flows');
    it('picks default provider and path', async () => {
        const result = await (0, loader_1.loadFlow)(flowName, {}); // no flags
        expect(result.provider).toBe('postgres');
        expect(result.pathName).toBe('initial');
        const expected = [
            'connection.ts',
            'reset.ts',
            'schema.ts'
        ].map(f => node_path_1.default.join(root, flowName, 'providers/postgres/steps', f));
        expect(result.stepPaths).toEqual(expected);
    });
    it('respects provider override', async () => {
        // This test will fail until we add another provider
        // Just testing the override mechanism works
        try {
            await (0, loader_1.loadFlow)(flowName, { provider: 'mysql' });
            fail('Should have thrown an error for non-existent provider');
        }
        catch (error) {
            expect(error.message).toContain('Provider mysql not found');
        }
    });
    it('respects path override', async () => {
        const result = await (0, loader_1.loadFlow)(flowName, { path: 'upgrade' });
        expect(result.provider).toBe('postgres');
        expect(result.pathName).toBe('upgrade');
        const expected = [
            'connection.ts',
            'schema.ts',
        ].map(f => node_path_1.default.join(root, flowName, 'providers/postgres/steps', f));
        expect(result.stepPaths).toEqual(expected);
    });
    it('throws on invalid path', async () => {
        try {
            await (0, loader_1.loadFlow)(flowName, { path: 'nonexistent' });
            fail('Should have thrown an error for non-existent path');
        }
        catch (error) {
            expect(error.message).toContain('Path nonexistent not found');
        }
    });
});
//# sourceMappingURL=initial.loader.spec.js.map
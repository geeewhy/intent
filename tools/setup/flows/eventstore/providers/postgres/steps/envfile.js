"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = step;
const promises_1 = __importDefault(require("fs/promises"));
const node_path_1 = __importDefault(require("node:path"));
const diff_1 = require("diff");
const prompt_1 = require("../../../../../shared/prompt");
/**
 * Generate .env file from template using collected connection and user data
 */
async function step(ctx) {
    const connection = ctx.vars.connection;
    const dbUsers = ctx.vars.dbUsers;
    if (!connection || !dbUsers) {
        throw new Error('Missing connection or dbUsers in context. Ensure previous steps ran correctly.');
    }
    const templatePath = node_path_1.default.join(ctx.artifactsDir, 'templates', 'postgres.env_template');
    const envPath = process.env.NODE_ENV === 'test'
        ? node_path_1.default.join(process.cwd(), '.env_test_generated')
        : node_path_1.default.join(process.cwd(), '.env.local');
    const template = await promises_1.default.readFile(templatePath, 'utf-8');
    const envContent = template
        .replace('{{LOCAL_DB_HOST}}', connection.host)
        .replace('{{LOCAL_DB_PORT}}', String(connection.port))
        .replace('{{LOCAL_DB_USER}}', connection.user)
        .replace('{{LOCAL_DB_PASSWORD}}', connection.password || '')
        .replace('{{LOCAL_DB_NAME}}', connection.database)
        .replace('{{LOCAL_DB_ADMIN_USER}}', dbUsers.admin.user)
        .replace('{{LOCAL_DB_ADMIN_PASSWORD}}', dbUsers.admin.password)
        .replace('{{LOCAL_DB_TEST_USER}}', dbUsers.tester.user)
        .replace('{{LOCAL_DB_TEST_PASSWORD}}', dbUsers.tester.password);
    let shouldWrite = true;
    let existingContent = '';
    try {
        await promises_1.default.access(envPath);
        existingContent = await promises_1.default.readFile(envPath, 'utf-8');
        const hasYesFlag = ctx.vars.yes || process.argv.includes('--yes') || process.argv.includes('-Y');
        if (existingContent === envContent) {
            ctx.logger.info('.env.local already up to date. No changes.');
            return;
        }
        if (hasYesFlag) {
            ctx.logger.info('Overwriting .env.local (--yes flag set)');
        }
        else {
            const diff = (0, diff_1.createTwoFilesPatch)('.env.local', '.env.local (new)', existingContent, envContent, '', '');
            ctx.logger.raw(`\n${diff}`);
            shouldWrite = await (0, prompt_1.promptYesNo)('.env.local has changes. Overwrite with above?', false);
            if (!shouldWrite) {
                ctx.logger.info('Skipping environment file generation');
                return;
            }
        }
    }
    catch {
        // file doesn't exist — proceed
        ctx.logger.info('.env.local not found, will generate a new one.');
    }
    await promises_1.default.writeFile(envPath, envContent);
    ctx.logger.info(`Environment file generated at ${envPath}`);
}
//# sourceMappingURL=envfile.js.map
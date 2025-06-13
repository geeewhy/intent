#!/usr/bin/env node
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
//src/tools/setup/setup.ts
/**
 * CLI entry point for the setup tool
 */
const commander_1 = require("commander");
const flows_1 = require("./flows");
const runner_1 = require("./flows/runner");
const logger_1 = require("./shared/logger");
const dotenv = __importStar(require("dotenv"));
dotenv.config();
const logger = (0, logger_1.createLogger)();
const program = new commander_1.Command();
// Handle CTRL+C (SIGINT) to exit the process with error code 1
process.on('SIGINT', () => {
    logger.error('Process terminated by user (CTRL+C)');
    process.exit(1);
});
// Global options for all sub-commands
const globalOptions = [
    ['--provider <name>', 'Override provider folder'],
    ['--path <name>', 'Choose execution path from flow.yaml'],
    ['-Y, --yes', 'Automatically answer yes to all prompts'],
    ['--flow <name>', 'Specify which flow to execute']
];
program
    .name('setup')
    .description('Modular infrastructure setup CLI')
    .version('1.0.0');
// Add global options to the root command
globalOptions.forEach(([flag, description]) => {
    program.option(flag, description);
});
/**
 * Register a flow as a sub-command
 * @param name Flow name
 * @param description Flow description
 */
async function registerFlowCommand(name, description) {
    const command = program
        .command(name)
        .description(description || `Run the ${name} flow`);
    // Add global options to the command
    globalOptions.forEach(([flag, description]) => {
        command.option(flag, description);
    });
    // Action handler for the command
    command.action(async (options) => {
        try {
            // Check if --yes or -Y is in the raw args
            const hasYesFlag = process.argv.includes('--yes') || process.argv.includes('-Y');
            // Get options from both the command and the program
            const combinedOptions = {
                ...program.opts(),
                ...options
            };
            const exitCode = await (0, runner_1.runFlowWithErrorHandling)(name, {
                provider: combinedOptions.provider,
                path: combinedOptions.path,
                interactive: combinedOptions.interactive,
                yes: hasYesFlag || combinedOptions.yes
            });
            process.exit(exitCode);
        }
        catch (error) {
            logger.error(`Error running flow ${name}: ${error.message}`);
            process.exit(1);
        }
    });
}
/**
 * Main function to initialize the CLI
 */
async function main() {
    try {
        // Get all available flows
        const flows = await (0, flows_1.getFlowsInfo)();
        if (flows.length === 0) {
            logger.warn('No flows found. Please check the flows directory.');
            process.exit(1);
        }
        // Register each flow as a sub-command
        for (const flow of flows) {
            await registerFlowCommand(flow.name, flow.description);
        }
        // Add help command
        program.command('help')
            .description('Display help information')
            .action(() => {
            program.help();
        });
        // Add interactive command
        program.command('interactive')
            .alias('i')
            .description('Interactive mode - select a flow to execute')
            .option('-Y, --yes', 'Automatically answer yes to all prompts')
            .action(async (options) => {
            try {
                const { promptSelect } = await Promise.resolve().then(() => __importStar(require('./shared/prompt')));
                const flowNames = flows.map(flow => flow.name);
                console.log('Available flows:');
                const selectedFlow = await promptSelect('Select a flow to execute:', flowNames);
                // Get the global options
                const parsedArgs = program.opts();
                // Run the selected flow with interactive mode
                const exitCode = await (0, runner_1.runFlowWithErrorHandling)(selectedFlow, {
                    interactive: true,
                    yes: parsedArgs.yes || options.yes || false
                });
                process.exit(exitCode);
            }
            catch (error) {
                logger.error(`Error selecting flow: ${error.message}`);
                process.exit(1);
            }
        });
        // Add custom help text to list available flows
        const originalHelp = program.helpInformation;
        program.helpInformation = function () {
            const help = originalHelp.apply(this);
            const flowsSection = [
                '',
                'Available Flows:',
                ...flows.map(flow => `  ${flow.name.padEnd(15)}${flow.description || ''}`)
            ].join('\n');
            return help + flowsSection;
        };
        // Parse command line arguments
        program.parse(process.argv);
        // Parse command line arguments to get options
        const parsedArgs = program.opts();
        const args = process.argv.slice(2);
        // Check if --flow option is provided
        if (parsedArgs.flow) {
            const flowName = parsedArgs.flow;
            const flowExists = flows.some(flow => flow.name === flowName);
            if (!flowExists) {
                logger.error(`Flow '${flowName}' not found. Available flows: ${flows.map(f => f.name).join(', ')}`);
                process.exit(1);
            }
            // Run the specified flow
            try {
                const exitCode = await (0, runner_1.runFlowWithErrorHandling)(flowName, {
                    provider: parsedArgs.provider,
                    path: parsedArgs.path,
                    interactive: parsedArgs.interactive,
                    yes: parsedArgs.yes
                });
                process.exit(exitCode);
            }
            catch (error) {
                logger.error(`Error running flow ${flowName}: ${error.message}`);
                process.exit(1);
            }
        }
        // If no command is provided, show available flows
        if (args.length === 0) {
            // Just show available flows
            console.log('Available flows:');
            for (const flow of flows) {
                console.log(`  ${flow.name}${flow.description ? `: ${flow.description}` : ''}`);
            }
            console.log('\nUse with: setup <flow> [options]');
            console.log('For more details, use: setup --help');
            console.log('Use setup interactive or setup i to select a flow interactively');
            process.exit(0);
        }
    }
    catch (error) {
        logger.error(`Error initializing CLI: ${error.message}`);
        process.exit(1);
    }
}
// Run the main function
main().catch((error) => {
    logger.error(`Unhandled error: ${error.message}`);
    process.exit(1);
});
//# sourceMappingURL=setup.js.map
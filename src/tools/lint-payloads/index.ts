#!/usr/bin/env node
/**
 * Lint-core tool
 *
 * Placeholder.
 * Currently, checks that all registered commands with a payloadSchema also declare aggregateRouting (if not saga-only)
 */

import { DomainRegistry } from '../../core/registry';

// Get all registered command types
const commandTypes = DomainRegistry.commandTypes();

// Track issues
const issues: string[] = [];

// Check each command type
Object.entries(commandTypes).forEach(([type, meta]) => {
  // Skip commands without a payload schema
  if (!meta.payloadSchema) return;

  // Check if the command has aggregate routing
  if (!meta.aggregateRouting) {
    issues.push(`Command type '${type}' has a payloadSchema but no aggregateRouting`);
  }
});

// Report results
if (issues.length > 0) {
  console.error('Payload linting found issues:');
  issues.forEach(issue => console.error(`- ${issue}`));
  process.exit(1);
} else {
  console.log('All command payloads have proper routing configuration.');
  process.exit(0);
}
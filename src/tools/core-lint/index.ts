#!/usr/bin/env node
//src/tools/core-lint/index.ts
/**
 * Lint-core tool
 *
 * 1. Checks that all registered commands with a payloadSchema also declare aggregateRouting (if not saga-only)
 * 2. Extracts roles from condition functions and compares them against registered roles
 */

import { DomainRegistry } from '../../core/registry';
import {RegisteredAccessModels} from '../../core/policy-registry';
import initializeCore from "../../core/initialize";
void initializeCore();

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

/**
 * OBSOLETE
 * Extract roles from a function by analyzing its string representation
 * @param fn Function to analyze
 * @returns Array of extracted role strings
 */
/*function extractRolesFromFn(fn: Function): string[] {
  const src = fn.toString();
  console.log(src);

  const includesMatch = src.match(/\[\s*(['"][^'"]+['"](?:\s*,\s*['"][^'"]+['"])*)\s*\]\.includes\s*\(\s*role\s*\)/);
  const equalityMatches = [...src.matchAll(/role\s*[=!]=+\s*['"]([a-zA-Z0-9_-]+)['"]/g)].map(m => m[1]);

  let includesRoles: string[] = [];
  if (includesMatch) {
    const list = includesMatch[1];
    includesRoles = list.split(',').map(s => s.trim().replace(/['"]/g, ''));
  }

  return [...new Set([...includesRoles, ...equalityMatches])];
}*/

// Get registered roles by domain
const rolesByDomain = DomainRegistry.roles();

Object.entries(RegisteredAccessModels).forEach(([domain, roleToCmds]) => {
  const inferredRoles = Object.keys(roleToCmds);
  const declaredRoles = rolesByDomain[domain] ?? [];

  const undeclared = inferredRoles.filter(r => !declaredRoles.includes(r));
  if (undeclared.length > 0) {
    issues.push(`Domain '${domain}' uses unregistered roles: ${undeclared.join(', ')}`);
  }
});

// Report results
if (issues.length > 0) {
  console.error('❌ Core linting found issues:');
  issues.forEach(issue => console.error(`- ${issue}`));
  process.exit(1);
} else {
  console.log('✅ All core linting checks passed.');
  process.exit(0);
}

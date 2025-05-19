//src/infra/migrations/runMigrations.ts
import { Umzug } from 'umzug';
import { globSync } from 'glob';
import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { generateRlsPolicies, RlsPolicySql } from '../projections/genRlsSql';
import crypto from 'crypto';

dotenv.config();

/**
 * Creates a stable hash of a SQL string
 * @param sql SQL string to hash
 * @returns First 8 characters of the SHA-256 hash
 */
function hashSql(sql: string): string {
  return crypto.createHash('sha256').update(sql).digest('hex').slice(0, 8);
}

/**
 * Postgres storage adapter for Umzug
 */
class UmzugPostgresStorage {
  constructor(private readonly options: { pool: any; tableName: string }) {
    // Ensure tableName is properly schema-qualified if it doesn't already include a schema
    if (!this.options.tableName.includes('.')) {
      this.options.tableName = `core.${this.options.tableName}`;
    }
  }

  async logMigration({ name }: { name: string }) {
    const query = `
      INSERT INTO ${this.options.tableName} (name, executed_at)
      VALUES ($1, NOW())
    `;
    await this.options.pool.query(query, [name]);
  }

  async unlogMigration({ name }: { name: string }) {
    const query = `
      DELETE FROM ${this.options.tableName}
      WHERE name = $1
    `;
    await this.options.pool.query(query, [name]);
  }

  async executed() {
    try {
      const query = `
        SELECT name FROM ${this.options.tableName}
        ORDER BY executed_at
      `;
      const result = await this.options.pool.query(query);
      return result.rows.map((row: any) => row.name); // ✅ flat string array
    } catch (error) {
      const createTableQuery = `
        CREATE TABLE IF NOT EXISTS ${this.options.tableName} (
                                                               name TEXT PRIMARY KEY,
                                                               executed_at TIMESTAMP NOT NULL
        )
      `;
      await this.options.pool.query(createTableQuery);
      return [];
    }
  }
}

/**
 * Runs all migrations for read models
 * @param forceRls Whether to force reapplication of RLS policies
 */
export async function runAllMigrations(forceRls: boolean = false) {
  const pool = new Pool({
    host: process.env.LOCAL_DB_HOST || 'localhost',
    port: parseInt(process.env.LOCAL_DB_PORT || '5432'),
    user: process.env.LOCAL_DB_USER || 'postgres',
    password: process.env.LOCAL_DB_PASSWORD || 'postgres',
    database: process.env.LOCAL_DB_NAME || 'postgres',
  });

  const migrationDirs = globSync('src/core/**/read-models/migrations');

  console.log(`Found ${migrationDirs.length} migration directories`);

  try {
    for (const dir of migrationDirs) {
      console.log(`Running migrations from ${dir}`);
      const umzug = new Umzug({
        migrations: {
          glob: `${dir}/*.sql`,
          resolve: ({ path: migrationPath, context }) => {
            if (!migrationPath) throw new Error(`Missing path for migration`);
            const relativeName = path.relative(process.cwd(), migrationPath);
            return {
              name: relativeName,
              up: async () => {
                const sql = fs.readFileSync(migrationPath, 'utf8');
                try {
                  console.log(`Running migration: ${relativeName}`);
                  return context.query(sql);
                } catch (error) {
                  console.error(`Migration failed: ${relativeName}`, error);
                  throw error;
                }
              },
              down: async () => {
                console.log(`Down migration not supported for ${relativeName}`);
              },
            };
          },
        },
        context: pool,
        storage: new UmzugPostgresStorage({ pool, tableName: 'migrations' }),
        logger: console,
      });

      await umzug.up();
    }

    console.log('All migrations completed successfully');

    // Generate and apply RLS policies
    console.log('Generating RLS policies...');
    const rlsPolicies = await generateRlsPolicies();

    if (rlsPolicies.length > 0) {
      console.log(`Applying ${rlsPolicies.length} RLS policies...`);

      // When force mode is enabled, we use a timestamp in the migration name
      // This ensures that all policies are reapplied regardless of their content

      // Create a new Umzug instance for RLS policies
      const rlsUmzug = new Umzug({
        migrations: rlsPolicies.map((policy, index) => {
          const sqlHash = hashSql(policy.createPolicyQuery);
          const policyName = forceRls
            ? `rls-policy-${policy.tableName}-${policy.condition}-forced-${new Date().getTime()}`
            : `rls-policy-${policy.tableName}-${policy.condition}-${sqlHash}`;
          return {
            name: policyName,
            up: async () => {
              console.log(`Running RLS policy migration`, policy);
              // Execute the RLS policy SQL statements
              await pool.query(policy.enableRlsQuery);
              await pool.query(policy.dropPolicyQuery);
              await pool.query(policy.createPolicyQuery);

              // Execute the comment policy SQL statement if it exists
              if (policy.commentPolicyQuery) {
                await pool.query(policy.commentPolicyQuery);
              }

              return Promise.resolve();
            },
            down: async () => {
              console.log(`Down migration not supported for RLS policy ${policyName}`);
              return Promise.resolve();
            }
          };
        }),
        context: pool,
        storage: new UmzugPostgresStorage({ pool, tableName: 'rls_policy_migrations' }),
        logger: console,
      });

      await rlsUmzug.up();
      console.log('RLS policies applied successfully');
    } else {
      console.log('No RLS policies to apply');
    }
  } finally {
    await pool.end();
  }
}

// If this file is run directly, run all migrations
if (require.main === module) {
  // Check if --force-rls flag is present
  const forceRls = process.argv.includes('--force-rls');

  if (forceRls) {
    console.log('Force RLS mode enabled - all RLS policies will be reapplied');
  }

  runAllMigrations(forceRls)
      .then(() => process.exit(0))
      .catch((error) => {
        console.error('Migration failed:', error);
        process.exit(1);
      });
}

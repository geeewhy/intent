//src/infra/migrations/runMigrations.ts
import { Umzug } from 'umzug';
import { globSync } from 'glob';
import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

/**
 * Postgres storage adapter for Umzug
 */
class UmzugPostgresStorage {
  constructor(private readonly options: { pool: any; tableName: string }) {}

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
 */
export async function runAllMigrations() {
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
  } finally {
    await pool.end();
  }
}

// If this file is run directly, run all migrations
if (require.main === module) {
  runAllMigrations()
      .then(() => process.exit(0))
      .catch((error) => {
        console.error('Migration failed:', error);
        process.exit(1);
      });
}

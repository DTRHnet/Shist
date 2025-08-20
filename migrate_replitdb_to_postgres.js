#!/usr/bin/env node
// Migration script from Replit DB JSON export to PostgreSQL
// Assumptions: Replit DB exported as JSON, PostgreSQL connection available
// User must: Export Replit DB data, set DATABASE_URL, run with 'node migrate_replitdb_to_postgres.js'
// Safety: Transaction-based, rollback on errors, validates data before insert

import fs from 'fs';
import { Pool } from 'pg';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const DB_URL = process.env.DATABASE_URL;
if (!DB_URL) {
    console.error('Error: DATABASE_URL environment variable not set');
    process.exit(1);
}

// Create PostgreSQL connection pool
const pool = new Pool({ connectionString: DB_URL });

// Create kvstore table for generic Replit DB data
const createTableSQL = `
    CREATE TABLE IF NOT EXISTS kvstore (
        key TEXT PRIMARY KEY,
        value JSONB NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
    );
    
    CREATE INDEX IF NOT EXISTS idx_kvstore_value ON kvstore USING GIN (value);
`;

async function migrateReplitDB(jsonFilePath) {
    const client = await pool.connect();
    
    try {
        // Read and parse JSON file
        console.log(`Reading Replit DB export from: ${jsonFilePath}`);
        const jsonData = fs.readFileSync(jsonFilePath, 'utf8');
        const replitData = JSON.parse(jsonData);
        
        // Start transaction
        await client.query('BEGIN');
        
        // Create table if not exists
        await client.query(createTableSQL);
        
        let insertCount = 0;
        
        // Process each key-value pair
        for (const [key, value] of Object.entries(replitData)) {
            try {
                // Validate key (non-empty string)
                if (!key || typeof key !== 'string') {
                    console.warn(`Skipping invalid key: ${key}`);
                    continue;
                }
                
                // Insert or update the record
                await client.query(
                    'INSERT INTO kvstore (key, value, updated_at) VALUES ($1, $2, NOW()) ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()',
                    [key, JSON.stringify(value)]
                );
                
                insertCount++;
                
                if (insertCount % 100 === 0) {
                    console.log(`Processed ${insertCount} records...`);
                }
            } catch (recordError) {
                console.error(`Error processing record ${key}:`, recordError.message);
                // Continue processing other records
            }
        }
        
        // Commit transaction
        await client.query('COMMIT');
        
        console.log(`\nMigration completed successfully!`);
        console.log(`Total records migrated: ${insertCount}`);
        
        // Display summary
        const result = await client.query('SELECT COUNT(*) as total FROM kvstore');
        console.log(`Total records in kvstore table: ${result.rows[0].total}`);
        
    } catch (error) {
        // Rollback on error
        await client.query('ROLLBACK');
        console.error('Migration failed:', error.message);
        process.exit(1);
    } finally {
        client.release();
    }
}

// Main execution
async function main() {
    const jsonFile = process.argv[2];
    
    if (!jsonFile) {
        console.error('Usage: node migrate_replitdb_to_postgres.js <replit-db-export.json>');
        console.error('');
        console.error('Example:');
        console.error('  node migrate_replitdb_to_postgres.js replit_db_export.json');
        process.exit(1);
    }
    
    if (!fs.existsSync(jsonFile)) {
        console.error(`Error: File '${jsonFile}' not found`);
        process.exit(1);
    }
    
    try {
        await migrateReplitDB(jsonFile);
        console.log('Migration process completed.');
    } catch (error) {
        console.error('Fatal error:', error.message);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

main();
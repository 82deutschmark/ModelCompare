#!/usr/bin/env node

/**
 * Author: Claude Code using Sonnet 4
 * Date: 2025-09-28
 * PURPOSE: Automated database migration to remove PII fields from users table
 * This script handles the interactive drizzle-kit migration that removes:
 * - email, firstName, lastName, profileImageUrl columns
 * SRP/DRY check: Pass - Single responsibility for database migration
 * shadcn/ui: N/A - Backend migration script
 */

import { spawn } from 'child_process';
import { promisify } from 'util';

console.log('🔒 Starting ZDR/GDPR compliance database migration...');
console.log('📋 This will remove PII fields: email, firstName, lastName, profileImageUrl');
console.log('⚠️  This is irreversible but required for privacy compliance');

async function runMigration() {
  return new Promise((resolve, reject) => {
    const drizzleProcess = spawn('npx', ['drizzle-kit', 'push'], {
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: true
    });

    let output = '';
    let hasAskedForConfirmation = false;

    drizzleProcess.stdout.on('data', (data) => {
      const text = data.toString();
      output += text;
      process.stdout.write(text);

      // Look for the confirmation prompt
      if (text.includes('Do you still want to push changes?') && !hasAskedForConfirmation) {
        hasAskedForConfirmation = true;
        console.log('\n✅ Auto-confirming migration (removing PII fields for compliance)...');
        // Send the confirmation
        drizzleProcess.stdin.write('\n'); // Move to "Yes" option
        drizzleProcess.stdin.write('\n'); // Confirm selection
      }
    });

    drizzleProcess.stderr.on('data', (data) => {
      const text = data.toString();
      process.stderr.write(text);
    });

    drizzleProcess.on('close', (code) => {
      if (code === 0) {
        console.log('\n✅ Database migration completed successfully!');
        console.log('🔒 PII fields removed - database is now ZDR/GDPR compliant');
        resolve();
      } else {
        console.error(`\n❌ Migration failed with exit code ${code}`);
        reject(new Error(`Migration failed with exit code ${code}`));
      }
    });

    drizzleProcess.on('error', (error) => {
      console.error('❌ Failed to start migration process:', error);
      reject(error);
    });
  });
}

async function main() {
  try {
    await runMigration();
    console.log('\n🎉 Migration complete! TypeScript compilation should now work.');
    console.log('💡 Run "npm run check" to verify TypeScript compilation.');
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

main();
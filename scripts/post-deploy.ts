#!/usr/bin/env tsx
import { execSync } from 'node:child_process';

function run(cmd: string) {
	console.log(`[post-deploy] ${cmd}`);
	execSync(cmd, { stdio: 'inherit', env: process.env });
}

async function main() {
	try {
		if (!process.env.DATABASE_URL) {
			throw new Error('DATABASE_URL is required');
		}
		run('npm run db:push');
		try {
			run('npm run db:seed');
		} catch (e) {
			console.warn('[post-deploy] seed failed or not necessary');
		}
		console.log('[post-deploy] completed');
	} catch (e: any) {
		console.error('[post-deploy] error:', e?.message || e);
		process.exit(1);
	}
}

main();
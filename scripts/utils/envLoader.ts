import * as fs from 'fs';
import * as path from 'path';
import type { Env } from '../../src/env';

/**
 * Load environment variables from .dev.vars file
 * @param filePath Optional custom path to the .dev.vars file
 * @returns Record of environment variables
 */
export function loadDevVars(filePath?: string): Record<string, string> {
    const devVarsPath = filePath || path.join(process.cwd(), '.dev.vars');
    const env: Record<string, string> = {};

    if (fs.existsSync(devVarsPath)) {
        const content = fs.readFileSync(devVarsPath, 'utf8');
        content.split('\n').forEach(line => {
            const trimmed = line.trim();
            if (trimmed && !trimmed.startsWith('#')) {
                const [key, ...valueParts] = trimmed.split('=');
                if (key && valueParts.length > 0) {
                    env[key.trim()] = valueParts.join('=').trim();
                }
            }
        });
        console.log(`✅ Loaded ${Object.keys(env).length} environment variables from ${devVarsPath}`);
    } else {
        console.warn(`⚠️ Environment file not found: ${devVarsPath}`);
    }

    return env;
}

/**
 * Load environment variables and cast to Env type
 * @param filePath Optional custom path to the .dev.vars file
 * @returns Env object with typed environment variables
 */
export function loadEnv(filePath?: string): Env {
    const env = loadDevVars(filePath);
    return env as unknown as Env;
}

/**
 * Validate that required environment variables are present
 * @param env Environment variables object
 * @param requiredVars Array of required variable names
 * @throws Error if any required variables are missing
 */
export function validateEnv(env: Record<string, string>, requiredVars: string[]): void {
    const missing = requiredVars.filter(varName => !env[varName]);
    
    if (missing.length > 0) {
        throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }
    
    console.log(`✅ All required environment variables present: ${requiredVars.join(', ')}`);
}

/**
 * Debug function to safely log environment variables (masks sensitive data)
 * @param env Environment variables object
 * @param sensitiveKeys Keys that should be masked in logs
 */
export function debugEnv(env: Record<string, string>, sensitiveKeys: string[] = ['PRIVATE_KEY', 'API_KEY', 'BOT_TOKEN']): void {
    console.log('🔍 Environment Variables Debug:');
    console.log('================================');
    
    Object.entries(env).forEach(([key, value]) => {
        if (sensitiveKeys.some(sensitive => key.includes(sensitive))) {
            console.log(`${key}: ${'*'.repeat(Math.min(value.length, 20))}`);
        } else {
            console.log(`${key}: "${value}"`);
        }
    });
} 
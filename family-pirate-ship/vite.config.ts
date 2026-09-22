import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

/**
 * Build identity, stamped into the bundle so a diagnostic row can say which
 * build produced it. Falls back to 'dev' outside a git checkout (CI tarball,
 * a fresh unzip) rather than failing the build over a version string.
 */
function buildId(): string {
    const { version } = JSON.parse(readFileSync('./package.json', 'utf8')) as {
        version: string;
    };
    try {
        const sha = execSync('git rev-parse --short HEAD', {
            stdio: ['ignore', 'pipe', 'ignore'],
        })
            .toString()
            .trim();
        return `${version}+${sha}`;
    } catch {
        return `${version}+dev`;
    }
}

export default defineConfig({
    plugins: [react()],
    define: {
        __APP_VERSION__: JSON.stringify(buildId()),
    },
    test: {
        environment: 'jsdom',
        globals: false,
    },
});

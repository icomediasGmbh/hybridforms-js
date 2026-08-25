import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        environment: 'node',
        include: ['test/**/*.spec.ts'],
        testTimeout: 25000,
        hookTimeout: 25000,
        coverage: {
            provider: 'v8',
            include: ['src/**/*.ts'],
            reporter: ['text', 'lcov']
        }
    }
});

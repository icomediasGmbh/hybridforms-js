import eslint from '@eslint/js';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import { defineConfig } from 'eslint/config';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default defineConfig(
    {
        languageOptions: {
            globals: {
                ...globals.node,
                ...globals.es6,
                ...globals.mocha
            }
        }
    },
    eslint.configs.recommended,
    {
        files: ['**/*.ts', '**/*.tsx'],
        plugins: {
            '@typescript-eslint': tseslint.plugin
        },
        extends: [tseslint.configs.recommended, tseslint.configs.stylistic],

        languageOptions: {
            parser: tseslint.parser,
            parserOptions: { project: './tsconfig.spec.json' }
        },

        rules: {
            '@typescript-eslint/strict-boolean-expressions': 'off',
            eqeqeq: ['error', 'always'],
            'no-unused-vars': 'off',
            '@typescript-eslint/no-explicit-any': 'off'
        }
    },
    {
        // disable type-aware linting on JS files
        files: ['**/*.js'],
        extends: [tseslint.configs.disableTypeChecked]
    },
    eslintPluginPrettierRecommended
);

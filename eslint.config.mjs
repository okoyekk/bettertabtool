import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import jest from 'eslint-plugin-jest';
import prettier from 'eslint-config-prettier';
import globals from 'globals';

export default tseslint.config(
    {
        ignores: ['dist/**', 'coverage/**', 'node_modules/**'],
    },
    {
        files: ['**/*.{ts,tsx}'],
        extends: [js.configs.recommended, ...tseslint.configs.recommended],
        rules: {
            '@typescript-eslint/no-explicit-any': 'off',
            '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
        },
    },
    {
        files: ['src/**/*.{ts,tsx}'],
        extends: [react.configs.flat.recommended, jsxA11y.flatConfigs.recommended],
        plugins: {
            'react-hooks': reactHooks,
        },
        languageOptions: {
            globals: {
                ...globals.browser,
                ...globals.webextensions,
                ...globals.serviceworker,
            },
        },
        settings: {
            react: {
                version: '18.3',
            },
        },
        rules: {
            ...reactHooks.configs.recommended.rules,
            'react/prop-types': 'off',
        },
    },
    {
        files: ['src/**/*.test.{ts,tsx}'],
        extends: [jest.configs['flat/recommended']],
        languageOptions: {
            globals: {
                ...globals.jest,
            },
        },
    },
    {
        files: ['webpack.config.js', 'jest.config.ts'],
        extends: [js.configs.recommended],
        languageOptions: {
            globals: {
                ...globals.node,
            },
        },
    },
    prettier,
);

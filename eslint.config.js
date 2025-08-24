/*
 * Copyright (c) 2025 Analog Devices, Inc.
 * Copyright (c) 2025 Antmicro <www.antmicro.com>
 *
 * SPDX-License-Identifier: Apache-2.0
 */


import importPlugin from 'eslint-plugin-import';
import unusedImportsPlugin from "eslint-plugin-unused-imports";
import stylisticPlugin from '@stylistic/eslint-plugin'
import jsonPlugin from "@eslint/json";
import jsoncPlugin from "eslint-plugin-jsonc";
import reactPlugin from "eslint-plugin-react";

import tsParser from "@typescript-eslint/parser";
import tseslint from 'typescript-eslint';

export default tseslint.config(
    {
        extends: [
            tseslint.configs.recommendedTypeChecked,
            tseslint.configs.stylisticTypeChecked,
        ],
        files: ['**/*.tsx', '**/*.ts'],
        languageOptions: {
            parser: tsParser,
            parserOptions: {
                project: "./tsconfig.json",
            },
        },
        plugins: {
            "import": importPlugin,
            "unused-imports": unusedImportsPlugin,
            "stylistic": stylisticPlugin,
            "react": reactPlugin,
        },
        rules: {
            "@typescript-eslint/naming-convention": ["warn", {
                selector: "import",
                format: ["camelCase", "PascalCase"],
            }],
            curly: "error",
            eqeqeq: "error",
            "no-throw-literal": "error",
            semi: "error",
            "stylistic/indent": ["error", 4, { "outerIIFEBody": 0 }],
            "no-trailing-spaces": "error",
            "comma-dangle": ["error", "always-multiline"],
            "import/order": "error",
            "import/no-duplicates": "error",
            "unused-imports/no-unused-imports": "error",
            '@typescript-eslint/no-unused-vars': 'off',
            "unused-imports/no-unused-vars": ["error", {
                "vars": "all",
                "varsIgnorePattern": "^_",
                "args": "after-used",
                "argsIgnorePattern": "^_",
            }],
            '@typescript-eslint/no-unused-expressions': 'off',
            '@typescript-eslint/restrict-template-expressions': 'off',
            '@typescript-eslint/no-explicit-any': 'off',
            '@typescript-eslint/no-empty-function': 'off',
            'stylistic/multiline-comment-style': ["error", "starred-block"],
            'react/jsx-tag-spacing': [2, {
                beforeSelfClosing: 'always', beforeClosing: 'never'
            }],
        }
    },
    {
        files: ["**/*.json"],
        plugins: {
            "jsonc": jsoncPlugin,
            "json": jsonPlugin,
        },
        language: "json/json",
        rules: {
            "jsonc/indent": ["error", 4],
            "jsonc/comma-dangle": ["error", "never"],
            "jsonc/object-curly-spacing": ["error", "never"],
        },
    },
)


/*
 * Copyright (c) 2025 Analog Devices, Inc.
 * Copyright (c) 2025 Antmicro <www.antmicro.com>
 *
 * SPDX-License-Identifier: Apache-2.0
 */


import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import path from 'path';
import { viteSingleFile } from "vite-plugin-singlefile";

// https://vitejs.dev/config/
export default defineConfig(({ command, mode }) => {
    const production = command === 'build';

    const plugin_list = [preact()];
    if (mode === 'single-file') {
        plugin_list.push(viteSingleFile());
    }

    return {
        esbuild: {
            drop: (production) ? ['console', 'debugger'] : [],
        },
        resolve: {
            alias: {
                '@': path.resolve(path.join(__dirname, "src")),
                '@speedscope': path.resolve(path.join(__dirname, "third-party", "speedscope", "src")),
                '@styles': path.resolve(path.join(__dirname, "src", "styles")),
                "react": "preact/compat",
                "react-dom/test-utils": "preact/test-utils",
                "react-dom": "preact/compat",     // Must be below test-utils
                "react/jsx-runtime": "preact/jsx-runtime",
            }
        },
        plugins: plugin_list,
    };
});

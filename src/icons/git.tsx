/*
 * Copyright (c) 2025 Analog Devices, Inc.
 * Copyright (c) 2025 Antmicro <www.antmicro.com>
 *
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * The module with icon representing git repository.
 */


import { memo } from "preact/compat";


export default memo(() => {
    return (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M8.75004 12.8334V10.5C8.8312 9.76927 8.62167 9.03593 8.16671 8.45835C9.91671 8.45835 11.6667 7.29169 11.6667 5.25002C11.7134 4.52085 11.5092 3.80335 11.0834 3.20835C11.2467 2.53752 11.2467 1.83752 11.0834 1.16669C11.0834 1.16669 10.5 1.16669 9.33338 2.04169C7.79338 1.75002 6.20671 1.75002 4.66671 2.04169C3.50004 1.16669 2.91671 1.16669 2.91671 1.16669C2.74171 1.83752 2.74171 2.53752 2.91671 3.20835C2.49197 3.80095 2.28582 4.52248 2.33338 5.25002C2.33338 7.29169 4.08338 8.45835 5.83338 8.45835C5.60588 8.74419 5.43671 9.07085 5.33754 9.42085C5.23838 9.77085 5.20921 10.1384 5.25004 10.5M5.25004 10.5V12.8334M5.25004 10.5C2.61921 11.6667 2.33335 9.33335 1.16669 9.33335" stroke="var(--colors-gray-4)" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
    );
});

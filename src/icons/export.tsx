/*
 * Copyright (c) 2025 Analog Devices, Inc.
 * Copyright (c) 2025 Antmicro <www.antmicro.com>
 *
 * SPDX-License-Identifier: Apache-2.0
 */


interface ExportIconProps {
    /** The size (both width and height) of the icon */
    size?: string
    /** The color of the icon */
    color?: string
}

/** The icon representing exporting */
export default function ExportIcon({size="14", color="var(--colors-gray-4)"}: ExportIconProps) {
    return (
        <svg width={size} height={size} viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M2.33333 6.99999L2.33333 11.6667C2.33333 11.9761 2.45624 12.2728 2.67504 12.4916C2.89383 12.7104 3.19058 12.8333 3.49999 12.8333L10.5 12.8333C10.8094 12.8333 11.1062 12.7104 11.325 12.4916C11.5437 12.2728 11.6667 11.9761 11.6667 11.6667V6.99999M9.33333 3.49999L6.99999 1.16666M6.99999 1.16666L4.66666 3.49999M6.99999 1.16666L6.99999 8.74999" stroke={color} stroke-linecap="round" stroke-linejoin="round" />
        </svg>
    );
}

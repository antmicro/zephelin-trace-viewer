/*
 * Copyright (c) 2025 Analog Devices, Inc.
 * Copyright (c) 2025 Antmicro <www.antmicro.com>
 *
 * SPDX-License-Identifier: Apache-2.0
 */


interface ImportIconProps {
    /** The size (both width and height) of the icon */
    size?: string
    /** The color of the icon */
    color?: string
}

/** The icon representing importing */
export default function ImportIcon({size="16", color="#9F9FA3"}: ImportIconProps) {
    return (
        <svg width={size} height={size} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M13.5 6.5L13.4994 2.50062L9.5 2.5" stroke={color} stroke-linecap="round" stroke-linejoin="round" />
            <path d="M8.5 7.5L13.5 2.5" stroke={color} stroke-linecap="round" stroke-linejoin="round" />
            <path d="M11.5 8.5V13C11.5 13.1326 11.4473 13.2598 11.3536 13.3536C11.2598 13.4473 11.1326 13.5 11 13.5H3C2.86739 13.5 2.74021 13.4473 2.64645 13.3536C2.55268 13.2598 2.5 13.1326 2.5 13V5C2.5 4.86739 2.55268 4.74021 2.64645 4.64645C2.74021 4.55268 2.86739 4.5 3 4.5H7.5" stroke={color} stroke-linecap="round" stroke-linejoin="round" />
        </svg>
    );
}

/*
 * Copyright (c) 2025 Analog Devices, Inc.
 * Copyright (c) 2025 Antmicro <www.antmicro.com>
 *
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * The module with icon for adding panels.
 */

import Icon from "./base-icon";

interface CirclePlusIconProps {
    color?: string,
}

export default function CirclePlusIcon({color = "#9E9EA4"}: CirclePlusIconProps) {
    return (
        <Icon>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <g clip-path="url(#clip0_32_7)">
                <path d="M5.33337 8.00001L10.6667 8.00001M8.00004 5.33334L8.00004 10.6667M14.6667 8.00001C14.6667 11.6819 11.6819 14.6667 8.00004 14.6667C4.31814 14.6667 1.33337 11.6819 1.33337 8.00001C1.33337 4.31811 4.31814 1.33334 8.00004 1.33334C11.6819 1.33334 14.6667 4.31811 14.6667 8.00001Z" stroke={color} stroke-linecap="round" stroke-linejoin="round"/>
                </g>
                <defs>
                <clipPath id="clip0_32_7">
                <rect width="16" height="16" fill="white"/>
                </clipPath>
                </defs>
            </svg>
        </Icon>
    );
}

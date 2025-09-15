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
export default function ImportIcon({size="14", color="var(--colors-gray-4)"}: ImportIconProps) {
    return (
        <svg width={size} height={size} viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M6.99999 1.75V8.75M6.99999 8.75L4.66666 6.41667M6.99999 8.75L9.33332 6.41667M4.66666 2.91667H2.33332C2.0239 2.91667 1.72716 3.03958 1.50837 3.25838C1.28957 3.47717 1.16666 3.77391 1.16666 4.08333V9.91667C1.16666 10.2261 1.28957 10.5228 1.50837 10.7416C1.72716 10.9604 2.0239 11.0833 2.33332 11.0833H11.6667C11.9761 11.0833 12.2728 10.9604 12.4916 10.7416C12.7104 10.5228 12.8333 10.2261 12.8333 9.91667V4.08333C12.8333 3.77391 12.7104 3.47717 12.4916 3.25838C12.2728 3.03958 11.9761 2.91667 11.6667 2.91667H9.33332" stroke={color} stroke-width="0.875" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
    );
}

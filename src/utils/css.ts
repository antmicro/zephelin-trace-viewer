/*
 * Copyright (c) 2025 Analog Devices, Inc.
 * Copyright (c) 2025 Antmicro <www.antmicro.com>
 *
 * SPDX-License-Identifier: Apache-2.0
 */


/**
 * The module defining utilities for CSS classes.
 */


/**
 * Allows to define more than one CSS class in one className property.
 * @param names List of CSS class names to combine.
 */
export function css(...names: string[]) {
    return names.join(" ");
}


/**
 * Allows to define more than one CSS class in one className property with option to filter out elements.
 * @param classes Object with CSS class name as a key and boolean as a value indicating whether to include this class.
 */
export function cssOptions(classes: Record<string, boolean>) {
    return css(...Object.entries(classes).filter(([_, include]) => include).map(([name, _]) => name));
}

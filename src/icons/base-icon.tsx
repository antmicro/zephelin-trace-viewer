/*
 * Copyright (c) 2025 Analog Devices, Inc.
 * Copyright (c) 2025 Antmicro <www.antmicro.com>
 *
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * The module with base icon definition.
 */

import style from "@styles/icons.module.scss";

export default function Icon({children}) {
    return (
        <div className={style.icon}>
            {children}
        </div>
    );
}

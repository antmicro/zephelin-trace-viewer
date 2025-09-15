/*
 * Copyright (c) 2025 Analog Devices, Inc.
 * Copyright (c) 2025 Antmicro <www.antmicro.com>
 *
 * SPDX-License-Identifier: Apache-2.0
 */


/**
 * The module with tiling panel wrapper that sets proper background color with z-index -2.
 */


import { memo } from "preact/compat";
import style from "@styles/app.module.scss";


export default memo(({children}) => {
    return (
        <div className={style["tiling-panel"]}>
            {children}
            <div className={style.background} />
        </div>
    );
});


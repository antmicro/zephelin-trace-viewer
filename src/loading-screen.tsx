/*
 * Copyright (c) 2025 Analog Devices, Inc.
 * Copyright (c) 2025 Antmicro <www.antmicro.com>
 *
 * SPDX-License-Identifier: Apache-2.0
 */


/**
 * The module with loading screen.
 */


import { memo } from "preact/compat";

import style from "@styles/app.module.scss";
import LoadingIcon from "@/icons/loading";


export default memo(() => {
    return (
        <div className={style["loading-screen"]}>
            <LoadingIcon width="5rem" height="6rem" color="var(--colors-purple)" />
        </div>
    );
});

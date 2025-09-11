/*
 * Copyright (c) 2025 Analog Devices, Inc.
 * Copyright (c) 2025 Antmicro <www.antmicro.com>
 *
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * The module with maximize icon.
 */

import { memo } from 'preact/compat';
import style from "@styles/icons.module.scss";


export default memo(() => {
    return (
        <div className={style.maximize}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M14 14L10 10M14 14V10.8M14 14H10.8M2 10.8V14M2 14H5.2M2 14L6 10M14 5.2V2M14 2H10.8M14 2L10 6M2 5.2V2M2 2H5.2M2 2L6 6" stroke="#9E9EA4" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
        </div>
    );
});

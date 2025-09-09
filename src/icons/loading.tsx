/*
 * Copyright (c) 2025 Analog Devices, Inc.
 * Copyright (c) 2025 Antmicro <www.antmicro.com>
 *
 * SPDX-License-Identifier: Apache-2.0
 */


/**
 * The module with loading icon that automatically spins.
 */

import { memo } from "preact/compat";

import style from "@styles/app.module.scss";


export default memo(({width="17", height="16", color="var(--colors-gray-6)"}: {width?: string, height?: string, color?: string}) => {
    return (
        <svg className={style["loading-icon"]} width={width} height={height} viewBox="0 0 17 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M13.2509 10.4236C13.8025 9.34239 13.9688 8.10538 13.7223 6.9169C13.4758 5.72843 12.8313 4.65958 11.8952 3.88691C10.9591 3.11425 9.7875 2.68398 8.57384 2.6672C7.36019 2.65041 6.17711 3.0481 5.22003 3.79458C4.26295 4.54107 3.58912 5.59168 3.30984 6.77288C3.03057 7.95409 3.16256 9.19522 3.684 10.2913C4.20545 11.3873 5.08517 12.2727 6.17784 12.8012C7.27051 13.3297 8.51076 13.4697 9.69374 13.1981L9.50955 12.3959C8.50912 12.6257 7.46025 12.5073 6.53619 12.0603C5.61214 11.6134 4.86817 10.8646 4.42719 9.9377C3.98621 9.01079 3.87459 7.96118 4.11077 6.96225C4.34695 5.96332 4.9168 5.07483 5.72619 4.44354C6.53558 3.81225 7.53609 3.47593 8.56246 3.49013C9.58883 3.50432 10.5797 3.86819 11.3713 4.52162C12.1629 5.17506 12.708 6.07897 12.9164 7.08404C13.1249 8.08912 12.9843 9.13524 12.5178 10.0496L13.2509 10.4236Z" stroke={color} />
        </svg>
    );
});

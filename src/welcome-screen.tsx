/*
 * Copyright (c) 2025 Analog Devices, Inc.
 * Copyright (c) 2025 Antmicro <www.antmicro.com>
 *
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * The module implementing welcome screen for the application.
 */


import { memo } from "preact/compat";

import styles from "@styles/welcome-screen.module.scss";
import { Dispatch, StateUpdater, useState } from "preact/hooks";
import { appRefAtom } from "@speedscope/app-state";
import DragDropLayout from "./drag-drop-layout";
import LargeLogo from "@/icons/large-logo";
import LoadingIcon from "@/icons/loading";


/** The trapezoidal highlight of the logo */
const TrapezoidGradient = memo(({className}: {className: string}) => {
    return (
        <svg width="1440" height="588" className={className} viewBox="0 0 1440 588" fill="none" xmlns="http://www.w3.org/2000/svg">
            <g filter="url(#filter0_f_162_3226)">
                <path d="M1440 558H0L419.138 1H1020.86L1440 558Z" fill="url(#paint0_radial_162_3226)" fill-opacity="0.3" />
            </g>
            <defs>
                <filter id="filter0_f_162_3226" x="-30" y="-29" width="1500" height="617" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
                    <feFlood flood-opacity="0" result="BackgroundImageFix" />
                    <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
                    <feGaussianBlur stdDeviation="15" result="effect1_foregroundBlur_162_3226" />
                </filter>
                <radialGradient id="paint0_radial_162_3226" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(720 1) rotate(90) scale(557 1440)">
                    <stop stop-color="#6E32CA" />
                    <stop offset="1" stop-color="#361964" stop-opacity="0" />
                </radialGradient>
            </defs>
        </svg>
    );
});


/** The welcome screen with drag&drop section and button for importing traces */
export default memo(({setWelcomeScreenSt}: {setWelcomeScreenSt: Dispatch<StateUpdater<boolean>>}) => {
    const [loadingSt, setLoadingSt] = useState<boolean>(false);

    const onClick = () => {
        setLoadingSt(true);
        appRefAtom.get()?.current?.browseForFile(
            () => {setLoadingSt(false); setWelcomeScreenSt(false);},
            () => {setLoadingSt(false);},
        );
    };

    return (
        <div id={styles["welcome-screen"]}>
            <div className={styles.title}>  {/* title */}
                <LargeLogo />
            </div>
            <div className={styles["info-wrapper"]}> {/* drag&drop section */}
                <DragDropLayout
                    onDropStart={() => setLoadingSt(true)}
                    onDropEnd={() => {setLoadingSt(false); setWelcomeScreenSt(false);}}>
                    <div className={styles.info}>
                        <div>
                            <div>
                                <svg width="26" height="29" viewBox="0 0 26 29" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <line x1="13.5" y1="1.46777" x2="13.5" y2="28.499" stroke="var(--colors-gray-6)" stroke-linecap="round" />
                                    <line x1="25.5" y1="15.6865" x2="0.5" y2="15.6865" stroke="var(--colors-gray-6)" stroke-linecap="round" />
                                </svg>
                            </div>
                            <div className={styles['drag-drop-description']}>
                                <h3>Select or drag and drop a trace in .tef (Trace Event Format)</h3>
                                <h5>
                                    To convert .ctf (Common Trace Format) trace received from Zephyr, use west zpl-prepare-trace command from the Zeppelin library.
                                </h5>
                            </div>
                            <button onClick={!loadingSt ? onClick : undefined}>
                                Browse {loadingSt ? <LoadingIcon /> : null}
                            </button>
                        </div>
                    </div>
                </DragDropLayout>
            </div>
            <div className={styles.footer}>
                Interactive visualizer for <a href="https://docs.zephyrproject.org/latest/services/tracing/index.html">Zephyr traces</a>
            </div>
            <div className={styles["shadow-ellipse"]} />
            <TrapezoidGradient className={styles["shadow-trapezoid"]} />
        </div>
    );
});

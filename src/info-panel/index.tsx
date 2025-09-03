/*
 * Copyright (c) 2025 Analog Devices, Inc.
 * Copyright (c) 2025 Antmicro <www.antmicro.com>
 *
 * SPDX-License-Identifier: Apache-2.0
 */


/**
 * The module gathering all panel definitions.
 */

import InfoPanel from "./info-panel";
import CPULoadPanel from "./cpu-load-panel";
import DieTempPanel from "./die-temp-panel";
import OperatorPanel from "./operator-panel";
import OperatorTypePanel from "./operator-type-panel";

export {InfoPanel, CPULoadPanel, DieTempPanel, OperatorTypePanel, OperatorPanel};
export * from "./memory-panel";

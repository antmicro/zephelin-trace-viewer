/*
 * Copyright (c) 2025 Analog Devices, Inc.
 * Copyright (c) 2025 Antmicro <www.antmicro.com>
 *
 * SPDX-License-Identifier: Apache-2.0
 */


import { FrameInfo } from "@speedscope/lib/profile";
import { FrameInfoT, ModelEventArgs, ModelEventName } from "@/event-types";


export function isOpFrame(maybeOpFrame?: FrameInfo): maybeOpFrame is FrameInfoT<ModelEventArgs> {
    return typeof(maybeOpFrame?.key) === "string" && maybeOpFrame?.key?.startsWith(`${ModelEventName}::`);
}

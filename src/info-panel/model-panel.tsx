/*
 * Copyright (c) 2025 Analog Devices, Inc.
 * Copyright (c) 2025 Antmicro <www.antmicro.com>
 *
 * SPDX-License-Identifier: Apache-2.0
 */


/**
 * The module implementing panel with model, layer and inference information.
 */

import { ComponentChildren, JSX } from 'preact';
import { useState } from 'preact/hooks';

import styles from "@styles/model-panel.module.scss";
import panelStyles from "@styles/info-panel.module.scss";
import { metadataAtom } from '@speedscope/app-state';
import { FrameInfoT, MetadataModelArgs, ModelEventArgs } from '../event-types';
import PanelTemplate from './common';
import { GenericInfo } from './info-panel';
import { isModelMetadata } from '@/utils/model';
import { TilingComponent } from '@/utils/tiling-component';


interface ModelInfoPanelProps {
    /** Frame selected in Speedscope */
    frame?: FrameInfoT<ModelEventArgs>,
    /** Parent of the selected frame */
    parent?: FrameInfoT<{model_id: number}>,
    /** Reference to the tilingComponent instance */
    tilingComponent: TilingComponent<ModelInfoPanelProps>
}


/**
 * The tabular information with additional arguments
 * included in selected event.
 */
function EventInfo({frame}: ModelInfoPanelProps): JSX.Element | undefined {
    if (frame?.args === undefined) { return; }
    const filterKeys: (keyof ModelEventArgs)[] = ["subgraph_idx", "op_idx", "tag", "runtime", "thread_id", "tag_len", "cpu_id"];
    const eventAdditionalInfo = Object.entries(frame.args.begin).filter(
        ([key, _]: [keyof ModelEventArgs, any]) => !filterKeys.includes(key),
    );
    if (eventAdditionalInfo.length === 0) { return; }
    return (
        <table>
            <thead>
                <tr>
                    <th className={styles.key}>Param</th>
                    <th>Start</th>
                    <th>End</th>
                </tr>
            </thead>
            <tbody>
                {eventAdditionalInfo.map(([key, value]) => <tr>
                    <th className={styles.key}>{key}</th>
                    <th>{value}</th>
                    <th>{frame?.args.end[key]}</th>
                </tr>,
                )}
            </tbody>
        </table>
    );
}

/**
 * The tabular information about layer associated with selected event,
 * including inputs, outputs and type of operation.
 */
function LayerInfo({frame, parent}: ModelInfoPanelProps): JSX.Element | undefined {
    const [metadataRef, setMetadataRef] = useState(metadataAtom.get());
    metadataAtom.subscribe(() => {
        setMetadataRef(metadataAtom.get());
    });

    const modelsData = (metadataRef ?? []).filter(isModelMetadata);
    let modelData: MetadataModelArgs | undefined = undefined;
    if (modelsData.length > 1) {
        const modelId = parent?.args.begin.model_id;
        if (modelId === undefined) {
            console.warn("Missing model address, cannot choose right model metadata");
            modelData = modelsData[0].args;
        }
        modelData = modelsData.find((m) => m.args.id === modelId)?.args;
    } else if (modelsData.length === 1) {
        console.debug("Only one model metadata available, using this metadata");
        modelData = modelsData[0].args;
    }
    const getTensor = (k: number) => {
        const tensor = modelData?.tensors.find((v) => (
            v.index === k && v.subgraph_idx === frame?.args.begin.subgraph_idx
        ));
        if (tensor === undefined) {return;}

        const name = tensor.name
            .split('/')
            .map((chunk, i, chunks) =>
                i === chunks.length - 1
                    ? chunk
                    : <>{chunk}/<wbr /></>);

        return (
            <li> {name}: [{tensor.shape.join(', ')}] of {tensor.dtype} </li>
        );
    };

    if (modelData === undefined) { return; }

    const opData = modelData.ops.find((v) => v.index === frame?.args.begin.op_idx);
    if (!opData) {return;}

    const InfoItem = (props: {children: ComponentChildren}) => <span className={styles["item-name"]}>{props.children}</span>;

    const parameters = Object.entries(opData.parameters ?? {})
        .map(([name, value]) =>
            typeof value === "string"
                ? [name, value]
                : [name, JSON.stringify(value)])
        .map(([name, value]) => <li>{name}: {value}</li>);

    return (
        <div className={styles["model-layer-section"]}>
            <h3> Layer info </h3>
            <ul>
                <li className={styles.major}> Operation type: {opData.op_name} </li>
                <li className={styles.major}>
                    <InfoItem>Inputs</InfoItem>:
                    <ol>
                        {opData.inputs.map(getTensor)}
                    </ol>
                </li>
                <li className={styles.major}>
                    <InfoItem>Outputs</InfoItem>:
                    <ol>
                        {opData.outputs.map(getTensor)}
                    </ol>
                </li>
                {parameters.length > 0 &&
                    <li className={styles.major}>
                        <InfoItem>Parameters</InfoItem>:
                        <ol>
                            {parameters}
                        </ol>
                    </li>
                }
            </ul>
        </div>
    );
}


/** The information panel about layer and additional argument of selected event */
export default function ModelInfoPanel(props: ModelInfoPanelProps): JSX.Element | undefined {
    // Call as function instead of VNodes to check whether object undefined is returned
    const event = EventInfo(props);
    const layer = LayerInfo(props);
    if (!event && !layer) {
        return <GenericInfo info="The event does not contain information to display" />;
    }
    return (
        <PanelTemplate
            tilingComponent={props.tilingComponent}
            additionalContentClass={panelStyles['no-padding']}
        >
            { () => (
                <div className={styles["model-event-section"]}>
                    {event}
                    {layer}
                </div>
            )}
        </PanelTemplate>
    );
}


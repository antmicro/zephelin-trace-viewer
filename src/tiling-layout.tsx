/**
 * The module with tiling manager layout.
 */

import { ComponentChild } from "preact";
import { memo } from "preact/compat";
import { Actions, DockLocation, IJsonModel, Layout, Model, Node, Orientation, TabNode } from "flexlayout-react";
import { metadataAtom } from "@speedscope/app-state";

import style from "@styles/app.module.scss";
import Speedscope from "./speedscope";
import InfoPanel from './info-panel';
import MemoryPanel from "./info-panel/memory-panel";
import CPULoadPanel from "./info-panel/cpu-load-panel";
import DieTempPanel from './info-panel/die-temp-panel';
import { TilingComponent, createJSONNode, getTilingComponent } from "./utils/tiling-component";


/** The schema of initial layout */
const initLayout: IJsonModel = {
    global: {},
    borders: [],
    layout: {
        // horizontal row
        type: "row",
        children: [
            {
                // vertical row
                type: "row",
                children: [
                    {
                        type: "tabset",
                        children: [createJSONNode(Speedscope)],
                    },
                    {
                        type: "tabset",
                        children: [createJSONNode(InfoPanel)],
                    },
                ],
            },
        ],
    },
};


/**
 * The upper limit of nodes in one row when spawning new elements.
 * When the limit is exceeded, nodes are added to the last tabset.
 */
const MAX_NODES_IN_ROW_FOR_SPAWNING = 3;


/**
 * The tiling manager layout based on FlexLayout library.
 *
 * It has to be stateless, otherwise Speedscope reloads (when the state is updated)
 * which leads to circular dependencies and infinite reloads.
 */
export default memo(() => {
    const model = Model.fromJson(initLayout);
    // Retrieve node with InfoPanel
    let infoPanelTab: Node;
    model.visitNodes((n, _l) => {(n.getAttr("name") === InfoPanel.title) && (infoPanelTab = n);});

    /**
     * Adds node to the parent of InfoPanel.
     * If there is no data for new node, it will not be created.
     */
    function addNode<T>(type_: TilingComponent<T>) {
        // Prepare data for the new node
        const data = type_.dataProvider ? type_.dataProvider() : undefined;
        if (type_.dataProvider && !data) {return;}

        let infoParent: Node | undefined = infoPanelTab;
        while (
            infoParent &&
            // Get next parent as long as current node is tab or is not horizontal
            (infoParent.getType() === "tab" || infoParent?.getOrientation() !== Orientation.HORZ)
        ) { infoParent = infoParent?.getParent();}
        if (model.getRoot().getId() === infoParent?.getId()) { infoParent = infoPanelTab.getParent(); }
        if (!infoParent) {
            console.warn("Parent of info panel is missing - new nodes will not be added");
            return;
        }

        const children = infoParent.getChildren();
        const tooManyNodes = (children.length ?? 0) >= MAX_NODES_IN_ROW_FOR_SPAWNING;
        model.doAction(Actions.addNode(
            createJSONNode(type_, data),
            (tooManyNodes ? children[children.length - 1].getId() : infoParent.getId()),
            (tooManyNodes ? DockLocation.CENTER : DockLocation.RIGHT),
            -1,
            true,
        ));
    };
    /** Removes the node with given ID */
    function removeNode<T>(type_: TilingComponent<T>) {
        model.visitNodes(n => {
            if (n.getAttr("name") === type_.title) {
                model.doAction(Actions.deleteTab(n.getId()));
            }
        });
    };

    /** Factory creating new tiles based on a node definition */
    const factory = (node: TabNode): ComponentChild => {
        const component = node.getComponent();
        if (component === undefined) {
            console.warn("Factory: component not defined");
            return;
        }
        const ComponentType = getTilingComponent(component);
        if (!ComponentType) {
            console.warn(`Factory: component '${component}' not registered`);
            return;
        }

        return <ComponentType {...(node.getConfig() ?? {})} />;
    };

    metadataAtom.subscribe(() => {
        // Delete outdated panels
        [MemoryPanel, CPULoadPanel, DieTempPanel].forEach(removeNode);
        // On each metadata update, try to create new panels
        [MemoryPanel, CPULoadPanel, DieTempPanel].forEach(addNode);
    });

    return (
        <div id={style['layout-container']}>
            <Layout
                model={model}
                factory={factory} />
        </div>
    );
// Override props comparison to avoid unnecessary reloads
}, (_prev, _new) => true);


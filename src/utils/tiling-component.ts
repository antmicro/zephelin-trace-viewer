/*
 * Copyright (c) 2025-2026 Analog Devices, Inc.
 * Copyright (c) 2025-2026 Antmicro <www.antmicro.com>
 *
 * SPDX-License-Identifier: Apache-2.0
 */


/**
 * The module with utilities for titling layout components.
 */

import { TabNode , IJsonTabNode, ITabAttributes , Actions } from "flexlayout-react";
import { loadingAtom, profileGroupAtom } from "@speedscope/app-state";
import { Atom } from "@speedscope/lib/atom";
import { FunctionalComponent } from "preact";
import { getGroupNames } from "@speedscope/app-state/utils";
import { GroupDataCache } from "./cache";

interface NodeConfig {
    /** Additional field kept in nodes of the FlexLayout model */
    sources?: string[]
}

export class TilingComponent<T> {

    /** The data used to initialize the component, calculated one when the trace is loaded */
    private data?: T | undefined = undefined;
    private _initialGroupName = "";

    public get targetGroups(): string[] {
        if (this.node) {
            const config = this.node.getConfig() as NodeConfig | undefined;
            return config?.sources ?? [this._initialGroupName];
        }
        return [this._initialGroupName];
    }

    public set targetGroups(newGroups: string[]) {
        if (this.node) {
            const layout = this.node.getModel();
            const config = (this.node.getConfig() as NodeConfig | undefined) ?? {};
            layout.doAction(
                Actions.updateNodeAttributes(this.node.getId(), {
                    config: {...config,  sources: newGroups },
                }),
            );
        } else {
            this._initialGroupName = newGroups[0];
        }
    }

    constructor(
        /** The title (unique for component type) of tile where the component is displayed */
        public title: string,
        /** The function creating JSX element with component */
        public component: FunctionalComponent<T>,
        /** The atomic state representing whether the component is available */
        public available: Atom<boolean>,
        /** The atomic number of created instances of this component */
        public instances: Atom<number>,
        /** The max number of instance for this component */
        public maxInstances = 10,
        /** Properties of FlexLayout tab, omitting ones that are set automatically */
        public additionalProps: Omit<ITabAttributes, "name" | "component" | "config">,
        /** The function producing properties for the component */
        public fetcher?: (groupName: string) => (T | undefined | null),
        /** Reference to the FlexLayout model representation of the panel */
        public node?: TabNode,
    ) {}

    /** Wrapps properties producing function in caching mechanism */
    public dataProvider = (groupName: string): (T | undefined | null) => {
        if (!this.fetcher) {return null;}

        return GroupDataCache.getOrCreateEntry<T | undefined | null>(
            this.title,
            groupName,
            (name) => this.fetcher!(name),
        );
    };

    /** Increases the number of the component's instances */
    incrInstances() {
        this.instances.set(this.instances.get() + 1);
    }
    /** Decreases the number of the component's instances */
    decrInstances() {
        this.instances.set(this.instances.get() - 1);
    }

    /**
     * Calculates new data (if dataProvider is available) and sets availability accordingly.
     */
    calculateData(groupName?: string) {
        if (!this.dataProvider) {return;}

        const groupNames = getGroupNames();

        const name = groupName ?? this.targetGroups[0];
        let newData = name ? this.dataProvider(name) : null;

        // Select data from first suitable group
        if (!newData) {
            for (const groupName of groupNames) {
                const data = this.dataProvider(groupName);
                if (data) {
                    newData = data;
                    this.targetGroups = [groupName];
                    break;
                }
            }
        }

        this.data = newData ?? undefined;
        this.available.set(Boolean(this.data));
    }

    /**
     * Creates JSON representation of the component.
     */
    createJSONNode(): IJsonTabNode {
        return {
            type: "tab",
            name: this.title,
            component: this.title,
            ...this.additionalProps,
        };
    }

    /**
     * Set the target group for the component.
     */
    setTargetGroup(groupName: string) {
        this.targetGroupName = groupName;

    }
}

/** The object storing all registered components */
const REGISTERED_COMPONENTS: Record<string, TilingComponent<any>> = {};


/** The name of CSS class which enables overflow for tiles, used for overflowing annotations */
export const CSS_ENABLING_OVERFLOW = "enable-overflow";

/**
 * Registers given component and returns a Proxy object from original component
 * with additional properties used in tiling layout.
 * @param component The callable object creating JSX element which will be embedded into tile.
 * @param title The tile's title, it has to be unique for each component type.
 * @param [additionalProps={}] The optional properties customizing the tab.
 */
export default <T extends object>(
    component: FunctionalComponent<T>,
    title: string, options: Partial<Omit<TilingComponent<T>, "title" | "component" | "available" | "instances" | "data">> = {},
): TilingComponent<T> | undefined => {
    // Make sure the title is unique
    if (title in REGISTERED_COMPONENTS) {
        console.error(`Title '${title}' already used - it has to be unique`);
        return;
    }

    // Set defaults
    options.additionalProps ??= {};
    options.additionalProps.minWidth ??= 100;
    options.additionalProps.minHeight ??= 100;
    options.additionalProps.enableClose ??= true;
    options.additionalProps.enableRename ??= false;
    const _available = (options.dataProvider === undefined);

    const tilingComponent = new TilingComponent<T>(
        title,
        component,
        new Atom(_available, `${title}_available`),
        new Atom(0, `${title}_instances`),
        options.maxInstances ?? 10,
        options.additionalProps,
        options.dataProvider,
    );

    const load = () => {
        if (loadingAtom.get()) { return; }
        tilingComponent.calculateData();
    };
    loadingAtom.subscribe(load);

    /*
     * If `window.initialTraces` is set, then this code is executed after
     * traces are loaded, which means `loadingAtom` does not trigger `calculateData`
     */
    if (profileGroupAtom.get()) {setTimeout(load);}

    // Register component
    REGISTERED_COMPONENTS[title] = tilingComponent;

    return tilingComponent;
};


/**
 * Returns registered component with given title.
 */
export function getTilingComponent(title: string): TilingComponent<any> | undefined {
    return REGISTERED_COMPONENTS[title];
}

/**
 * Returns all registered component.
 */
export function getAllComponents() {
    return Object.values(REGISTERED_COMPONENTS);
}

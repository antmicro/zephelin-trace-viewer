/**
 * The module with utilities for titling layout components.
 */

import { IJsonTabNode, ITabAttributes } from "flexlayout-react";
import { FunctionalComponent } from "preact";

export type TilingComponent<T> = FunctionalComponent<T> & {
    /** The title (unique for component type) of tile where the component is displayed */
    title: string,
    /** The function producing properties for the component */
    dataProvider?: () => (T | undefined | null),
    /** Properties of FlexLayout tab, omitting ones that are set automatically */
    additionalProps: Omit<ITabAttributes, "name" | "component" | "config" | "enableClose">
};

/** The map storing all registered components */
const REGISTERED_COMPONENTS = new Map<string, TilingComponent<any>>();

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
    title: string, additionalProps: TilingComponent<T>["additionalProps"] & Pick<TilingComponent<T>, "dataProvider"> = {},
): TilingComponent<T> | undefined => {
    // Make sure the title is unique
    if (REGISTERED_COMPONENTS.has(title)) {
        console.error(`Title '${title}' already used - it has to be unique`);
        return;
    }

    // Set defaults
    additionalProps.minWidth ??= 100;
    additionalProps.minHeight ??= 100;

    const handler = {
        get(target: FunctionalComponent<T>, prop: string) {
            if (prop === "title") {
                return title;
            }
            if (prop === "dataProvider") {
                return additionalProps.dataProvider;
            }
            if (prop === "additionalProps") {
                return additionalProps;
            }

            /* eslint-disable-next-line @typescript-eslint/no-unsafe-return */
            return prop in target ? target[prop] : undefined;
        },
    };
    const proxy = new Proxy(component, handler) as TilingComponent<T>;
    REGISTERED_COMPONENTS.set(title, proxy);
    return proxy;
};


/**
 * Creates JSON representation of a tile.
 * @param component The component that will be embedded into tile.
 * @param [data=undefined] Additional data used to initialize the component.
 */
export function createJSONNode<T>(component: TilingComponent<T>, data: T | undefined = undefined): IJsonTabNode {
    return {
        type: "tab",
        name: component.title,
        enableClose: false,
        component: component.title,
        config: data,
        ...component.additionalProps,
    };
}


/**
 * Returns registered component with given title.
 */
export function getTilingComponent(title: string) {
    return REGISTERED_COMPONENTS.get(title);
}

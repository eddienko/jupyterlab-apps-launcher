import {
    Launcher as JupyterlabLauncher,
    ILauncher
} from '@jupyterlab/launcher';

import {
    showErrorMessage,
} from '@jupyterlab/apputils';

import {
    TranslationBundle,
} from '@jupyterlab/translation';
import { ISettingRegistry } from '@jupyterlab/settingregistry';

import { classes, LabIcon } from '@jupyterlab/ui-components';


import { each } from '@lumino/algorithm';
import { CommandRegistry } from '@lumino/commands';
import { Widget } from '@lumino/widgets';
import { AttachedProperty } from '@lumino/properties';


import {
    map,
    toArray
} from '@lumino/algorithm';

import * as React from 'react';

/**
 * The known categories of launcher items and their default ordering.
 */

export class Launcher extends JupyterlabLauncher {
    /**
     * Construct a new launcher widget.
     */
    constructor(options: ILauncher.IOptions, settingRegistry: ISettingRegistry) {
        super(options);
        this._cwd2 = options.cwd;
        this._commands2 = options.commands;

        if (settingRegistry) {
            Promise.all([settingRegistry.load('jupyterlab-apps-launcher:plugin')]).then(([settings]) => {
                this._known_categories = (settings.get('known_categories').composite as string[]);
                this._kernel_categories = (settings.get('kernel_categories').composite as string[]);
                this._icon = (settings.get('icon').composite as {});
            });
        }

    }


    private replaceCategoryIcon(
        category: React.ReactElement,
        icon: LabIcon
    ): React.ReactElement {
        const children = React.Children.map(category.props.children, child => {
            if (child.props.className === 'jp-Launcher-sectionHeader') {
                const grandchildren = React.Children.map(
                    child.props.children,
                    grandchild => {
                        if (grandchild.props.className !== 'jp-Launcher-sectionTitle') {
                            return <icon.react stylesheet="launcherSection" />;
                        } else {
                            return grandchild;
                        }
                    }
                );

                return React.cloneElement(child, child.props, grandchildren);
            } else {
                return child;
            }
        });

        return React.cloneElement(category, category.props, children);
    }


    protected prerender(): React.ReactElement<any> | null {
        // Bail if there is no model.
        if (!this.model) {
            return null;
        }

        const categories = Object.create(null);
        each(this.model.items(), (item, index) => {
            const cat = item.category || 'Other';
            if (!(cat in categories)) {
                categories[cat] = [];
            }
            categories[cat].push(item);
        });
        // Within each category sort by rank
        for (const cat in categories) {
            categories[cat] = categories[cat].sort(
                (a: ILauncher.IItemOptions, b: ILauncher.IItemOptions) => {
                    return Private.sortCmp(a, b, this._cwd2, this._commands2);
                }
            );
        }

        // Variable to help create sections
        const sections: React.ReactElement<any>[] = [];
        let section: React.ReactElement<any>;

        // Assemble the final ordered list of categories, beginning with
        // KNOWN_CATEGORIES.
        const orderedCategories: string[] = [];
        each(this._known_categories, (cat, index) => {
            orderedCategories.push(cat);
        });
        for (const cat in categories) {
            if (this._known_categories.indexOf(cat) === -1) {
                orderedCategories.push(cat);
            }
        }

        // Now create the sections for each category
        orderedCategories.forEach(cat => {
            if (!categories[cat]) {
                return;
            }
            const item = categories[cat][0] as ILauncher.IItemOptions;
            const args = { ...item.args, cwd: this.cwd };
            const kernel = this._kernel_categories.indexOf(cat) > -1;

            // DEPRECATED: remove _icon when lumino 2.0 is adopted
            // if icon is aliasing iconClass, don't use it
            const iconClass = this._commands2.iconClass(item.command, args);
            const _icon = this._commands2.icon(item.command, args);
            const icon = _icon === iconClass ? undefined : _icon;

            if (cat in categories) {
                section = (
                    <div className="jp-Launcher-section" key={cat}>
                        <div className="jp-Launcher-sectionHeader">
                            <LabIcon.resolveReact
                                icon={icon}
                                iconClass={classes(iconClass, 'jp-Icon-cover')}
                                stylesheet="launcherSection"
                            />
                            <h2 className="jp-Launcher-sectionTitle">{cat}</h2>
                        </div>
                        <div className="jp-Launcher-cardContainer">
                            {toArray(
                                map(categories[cat], (item: ILauncher.IItemOptions) => {
                                    return Card(
                                        kernel,
                                        item,
                                        this,
                                        this._commands2,
                                        this._trans2,
                                        this._callback2
                                    );
                                })
                            )}
                        </div>
                    </div>
                );
                sections.push(section);
            }
        });

        // Wrap the sections in body and content divs.
        return (
            <div className="jp-Launcher-body">
                <div className="jp-Launcher-content">
                    <div className="jp-Launcher-cwd">
                        <h3>{this.cwd}</h3>
                    </div>
                    {sections}
                </div>
            </div>
        );

    }

    /**
     * Render the launcher to virtual DOM nodes.
     */
    protected render(): React.ReactElement<any> | null {
        // Bail if there is no model.
        if (!this.model) {
            return null;
        }

        // get the rendering from JupyterLab Launcher
        // and resort the categories
        // const launcherBody = super.render();
        const launcherBody = this.prerender();
        const launcherContent = launcherBody.props.children;
        const launcherCategories = launcherContent.props.children;

        const categories: React.ReactElement<any>[] = [];

        // Assemble the final ordered list of categories
        // based on KNOWN_CATEGORIES.
        each(this._known_categories, (category, index) => {
            React.Children.forEach(launcherCategories, cat => {
                if (cat.key === category) {
                    if (cat.key in this._icon) {
                        cat = this.replaceCategoryIcon(cat,
                            new LabIcon({ name: 'apps:' + cat.key, svgstr: atob(this._icon[category]) }));
                    }
                    categories.push(cat);
                }
            });
        });

        // Wrap the sections in body and content divs.
        return (
            <div className="jp-Launcher-body">
                <div className="jp-Launcher-content">
                    <div className="jp-Launcher-cwd">
                        <h3>{this.cwd}</h3>
                    </div>
                    {categories}
                </div>
            </div>
        );
    }

    private _commands2: CommandRegistry;
    private _trans2: TranslationBundle;
    private _callback2: (widget: Widget) => void;
    private _cwd2 = '';
    private _known_categories = ['Notebook', 'Console', 'Other'];
    private _kernel_categories = ['Notebook', 'Console'];
    private _icon: { [key: string]: string } = {};
}

function Card(
    kernel: boolean,
    item: ILauncher.IItemOptions,
    launcher: Launcher,
    commands: CommandRegistry,
    trans: TranslationBundle,
    launcherCallback: (widget: Widget) => void
): React.ReactElement<any> {
    // Get some properties of the command
    const command = item.command;
    const args = { ...item.args, cwd: launcher.cwd };
    const caption = commands.caption(command, args);
    const label = commands.label(command, args);
    const title = kernel ? label : caption || label;

    // Build the onclick handler.
    const onclick = () => {
        // If an item has already been launched,
        // don't try to launch another.
        if (launcher.pending === true) {
            return;
        }
        launcher.pending = true;
        void commands
            .execute(command, {
                ...item.args,
                cwd: launcher.cwd
            })
            .then(value => {
                launcher.pending = false;
                if (value instanceof Widget) {
                    launcherCallback(value);
                    launcher.dispose();
                }
            })
            .catch(err => {
                launcher.pending = false;
                void showErrorMessage(trans._p('Error', 'Launcher Error'), err);
            });
    };

    // With tabindex working, you can now pick a kernel by tabbing around and
    // pressing Enter.
    const onkeypress = (event: React.KeyboardEvent) => {
        if (event.key === 'Enter') {
            onclick();
        }
    };

    // DEPRECATED: remove _icon when lumino 2.0 is adopted
    // if icon is aliasing iconClass, don't use it
    const iconClass = commands.iconClass(command, args);
    const _icon = commands.icon(command, args);
    const icon = _icon === iconClass ? undefined : _icon;

    // Return the VDOM element.
    return (
        <div
            className="jp-LauncherCard"
            title={title}
            onClick={onclick}
            onKeyPress={onkeypress}
            tabIndex={100}
            data-category={item.category || 'Other'}
            key={Private.keyProperty.get(item)}
        >
            <div className="jp-LauncherCard-icon">
                {kernel ? (
                    item.kernelIconUrl ? (
                        <img src={item.kernelIconUrl} className="jp-Launcher-kernelIcon" />
                    ) : (
                            <div className="jp-LauncherCard-noKernelIcon">
                                {label[0].toUpperCase()}
                            </div>
                        )
                ) : (
                        <LabIcon.resolveReact
                            icon={icon}
                            iconClass={classes(iconClass, 'jp-Icon-cover')}
                            stylesheet="launcherCard"
                        />
                    )}
            </div>
            <div className="jp-LauncherCard-label" title={title}>
                <p>{label}</p>
            </div>
        </div>
    );

}



/**
 * The namespace for module private data.
 */
namespace Private {
    /**
     * An incrementing counter for keys.
     */
    let id = 0;

    /**
     * An attached property for an item's key.
     */
    export const keyProperty = new AttachedProperty<
        ILauncher.IItemOptions,
        number
    >({
        name: 'key',
        create: () => id++
    });

    /**
     * Create a fully specified item given item options.
     */
    export function createItem(
        options: ILauncher.IItemOptions
    ): ILauncher.IItemOptions {
        return {
            ...options,
            category: options.category || '',
            rank: options.rank !== undefined ? options.rank : Infinity
        };
    }

    /**
     * A sort comparison function for a launcher item.
     */
    export function sortCmp(
        a: ILauncher.IItemOptions,
        b: ILauncher.IItemOptions,
        cwd: string,
        commands: CommandRegistry
    ): number {
        // First, compare by rank.
        const r1 = a.rank;
        const r2 = b.rank;
        if (r1 !== r2 && r1 !== undefined && r2 !== undefined) {
            return r1 < r2 ? -1 : 1; // Infinity safe
        }

        // Finally, compare by display name.
        const aLabel = commands.label(a.command, { ...a.args, cwd });
        const bLabel = commands.label(b.command, { ...b.args, cwd });
        return aLabel.localeCompare(bLabel);
    }
}
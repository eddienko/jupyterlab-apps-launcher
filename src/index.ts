
import {
  elyraIcon
} from '@elyra/ui-components';

import {
  ILabShell,
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import { ICommandPalette, MainAreaWidget } from '@jupyterlab/apputils';
import { ILauncher, LauncherModel } from '@jupyterlab/launcher';
import { IMainMenu } from '@jupyterlab/mainmenu';
import { launcherIcon } from '@jupyterlab/ui-components';
import { ISettingRegistry } from '@jupyterlab/settingregistry';


import { toArray } from '@lumino/algorithm';
import { Widget } from '@lumino/widgets';

import { Launcher } from './launcher';
import '../style/index.css';

const EXTENSION_NAME = 'jupyterlab-apps-launcher:plugin';

/**
 * The command IDs used by the launcher plugin.
 */
const CommandIDs = {
  create: 'launcher:create',
};

/**
 * Initialization data for the extension.
 */
const extension: JupyterFrontEndPlugin<ILauncher> = {
  id: EXTENSION_NAME,
  autoStart: true,
  requires: [ILabShell, IMainMenu],
  optional: [ICommandPalette, ISettingRegistry],
  provides: ILauncher,
  activate: (
    app: JupyterFrontEnd,
    labShell: ILabShell,
    mainMenu: IMainMenu,
    palette: ICommandPalette | null,
    settingRegistry: ISettingRegistry | null,
  ): ILauncher => {
    console.log('AppLauncher - extension is activated!');

    // Find the MainLogo widget in the shell and replace it with the Elyra Logo
    const widgets = app.shell.widgets('top');
    let widget = widgets.next();

    while (widget !== undefined) {
      if (widget.id === 'jp-MainLogo') {
        elyraIcon.element({
          container: widget.node,
          justify: 'center',
          margin: '2px 5px 2px 5px',
          height: 'auto',
          width: '20px'
        });
        break;
      }

      widget = widgets.next();
    }



    // Use custom  launcher
    const { commands } = app;
    const model = new LauncherModel();

    commands.addCommand(CommandIDs.create, {
      label: 'New Launcher',
      execute: (args: any) => {
        const cwd = args['cwd'] ? String(args['cwd']) : '';
        const id = `launcher-${Private.id++}`;
        const callback = (item: Widget): void => {
          labShell.add(item, 'main', { ref: id });
        };

        const launcher = new Launcher({ model, cwd, callback, commands }, settingRegistry);

        launcher.model = model;
        launcher.title.icon = launcherIcon;
        launcher.title.label = 'Launcher';

        const main = new MainAreaWidget({ content: launcher });

        // If there are any other widgets open, remove the launcher close icon.
        main.title.closable = !!toArray(labShell.widgets('main')).length;
        main.id = id;

        labShell.add(main, 'main', { activate: args['activate'] as boolean });

        labShell.layoutModified.connect(() => {
          // If there is only a launcher open, remove the close icon.
          main.title.closable = toArray(labShell.widgets('main')).length > 1;
        }, main);

        return main;
      }
    });

    if (palette) {
      palette.addItem({ command: CommandIDs.create, category: 'Launcher' });
    }


    return model;
  }
};

/**
 * The namespace for module private data.
 */
namespace Private {
  /**
   * The incrementing id used for launcher widgets.
   */
  // eslint-disable-next-line
  export let id = 0;
}

export default extension;
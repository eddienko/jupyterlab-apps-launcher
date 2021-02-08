import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

/**
 * Initialization data for the jupyterlab-apps-launcher extension.
 */
const extension: JupyterFrontEndPlugin<void> = {
  id: 'jupyterlab-apps-launcher:plugin',
  autoStart: true,
  activate: (app: JupyterFrontEnd) => {
    console.log('JupyterLab extension jupyterlab-apps-launcher is activated!');
  }
};

export default extension;

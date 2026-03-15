import { LabIcon } from '@jupyterlab/ui-components';

// Import the SVG as a raw string via webpack's raw-loader / asset source
// JupyterLab's builder handles SVG imports as strings automatically.
import mystLogoSvgStr from '../style/icons/myst-logo.svg';

export const mystIcon = new LabIcon({
  name: 'jupyterlab-myst-console:myst-logo',
  svgstr: mystLogoSvgStr
});

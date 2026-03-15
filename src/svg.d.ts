// Tells TypeScript that SVG files imported as modules resolve to a string.
// JupyterLab's webpack config (via @jupyterlab/builder) handles the actual
// loading as raw SVG strings.
declare module '*.svg' {
  const content: string;
  export default content;
}

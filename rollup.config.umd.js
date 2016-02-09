import config from './rollup.config';

config.dest = 'dist/add-variable-declarations.umd.js';
config.format = 'umd';
config.moduleName = 'addVariableDeclarations';

export default config;

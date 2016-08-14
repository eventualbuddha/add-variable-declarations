import babel from 'rollup-plugin-babel';
import babelrc from 'babelrc-rollup';

var external = Object.keys(require('./package.json').dependencies);

export default {
  entry: 'src/index.js',
  plugins: [babel(babelrc())],
  external: external,
  targets: [
    {
      dest: 'dist/add-variable-declarations.mjs',
      format: 'es'
    },
    {
      dest: 'dist/add-variable-declarations.js',
      format: 'umd',
      moduleName: 'addVariableDeclarations'
    }
  ]
};

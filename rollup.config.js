import babel from 'rollup-plugin-babel';
import babelrc from 'babelrc-rollup';

export default {
  entry: 'src/index.js',
  plugins: [babel(babelrc())],
  targets: [
    {
      dest: 'dist/add-variable-declarations.es.js',
      format: 'es6'
    },
    {
      dest: 'dist/add-variable-declarations.umd.js',
      format: 'umd',
      moduleName: 'addVariableDeclarations'
    }
  ]
};

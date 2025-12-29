const path = require('path');

module.exports = {
  entry: './src/main.js',
  target: 'electron-main',
  module: {
    rules: require('./webpack.rules'),
  },
  resolve: {
    extensions: ['.js', '.jsx', '.json'],
    fallback: {
      // Ignore optional native dependencies
      bufferutil: false,
      'utf-8-validate': false,
    },
  },
};

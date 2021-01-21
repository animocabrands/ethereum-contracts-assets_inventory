'use strict';
module.exports = {
  'allow-uncaught': true,
  diff: true,
  extension: ['ts'],
  recursive: true,
  reporter: 'spec',
  require: ['hardhat/register'],
  slow: 300,
  spec: 'test/**/*.test.js',
  timeout: 60000,
  ui: 'bdd',
  watch: false,
  'watch-files': ['contracts/**/*.sol', 'test/**/*.js'],
};

const {task, extendConfig} = require('hardhat/config');
const {docgen} = require('solidity-docgen/dist/docgen');

function setConfigKey(config, userConfig, key, defaultValue) {
  if (userConfig && userConfig[key]) {
    config[key] = userConfig[key];
  } else if (defaultValue) {
    config[key] = defaultValue;
  }
}

extendConfig((config, userConfig) => {
  const defaultCompiler = config.solidity.compilers[0];
  const defaultCompilerVersion = `solc-${defaultCompiler.version}`;
  const optimizer = defaultCompiler.settings.optimizer;
  const defaultCompilerSettings = optimizer ? {optimizer} : undefined;

  config.solidity.docgen = {};
  const cfg = config.solidity.docgen;
  const userCfg = userConfig.solidity.docgen || {};

  setConfigKey(cfg, userCfg, 'input', config.paths.sources);
  setConfigKey(cfg, userCfg, 'output', 'docs');
  setConfigKey(cfg, userCfg, 'templates');
  setConfigKey(cfg, userCfg, 'exclude');
  setConfigKey(cfg, userCfg, 'extension', 'md');
  setConfigKey(cfg, userCfg, 'helpers');
  setConfigKey(cfg, userCfg, 'solc-module', defaultCompilerVersion);
  setConfigKey(cfg, userCfg, 'solc-settings', defaultCompilerSettings);
  setConfigKey(cfg, userCfg, 'output-structure', 'single');
});

task('docgen', 'Generates NATSPEC documentation', async (taskArguments, env) => {
  await docgen(env.config.solidity.docgen);
});

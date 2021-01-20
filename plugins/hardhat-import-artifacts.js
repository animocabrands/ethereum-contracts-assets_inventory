const fse = require('fs-extra');
const path = require('path');
const {TASK_COMPILE_SOLIDITY_LOG_COMPILATION_RESULT} = require('hardhat/builtin-tasks/task-names');

const {extendConfig, subtask} = require('hardhat/config');

extendConfig((config, userConfig) => {
  config.imports = userConfig.imports || [];
});

subtask(TASK_COMPILE_SOLIDITY_LOG_COMPILATION_RESULT, async (taskArguments, env, runSuper) => {
  // when run through the coverage task, config.artifactsDir must be used
  const artifactsDir = env.config.artifactsDir || env.config.paths.artifacts;
  for (const importPath of config.imports) {
    fse.copySync(importPath, path.join(artifactsDir, importPath));
  }
  await runSuper(taskArguments);
});

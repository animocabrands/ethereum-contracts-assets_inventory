const fse = require('fs-extra');
const {task, extendConfig} = require('hardhat/config');

require('solidity-coverage');

extendConfig((config) => {
  config.networks.coverage = {
    url: 'http://localhost:5458',
  };
});

task('coverage', async (taskArguments, env, runSuper) => {
  const artifacts = env.config.paths.artifacts;
  const artifactsBackup = `${artifacts}.bak`;
  if (fse.pathExistsSync(artifacts)) {
    fse.moveSync(artifacts, artifactsBackup, {overwrite: true});
  }
  const result = await runSuper(taskArguments);

  // env.config.path.artifacts was modified during the coverage task
  const coverageArtifacts = env.config.paths.artifacts;
  fse.moveSync(artifacts, coverageArtifacts, {overwrite: true});
  if (fse.pathExistsSync(artifactsBackup)) {
    fse.moveSync(artifactsBackup, artifacts, {});
  }

  return result;
});

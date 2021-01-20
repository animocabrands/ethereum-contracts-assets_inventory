const {task} = require('hardhat/config');

task('test', async (taskArguments, hre, runSuper) => {
  hre.accounts = await hre.web3.eth.getAccounts();
  return runSuper(taskArguments);
});

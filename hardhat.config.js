require('./plugins/hardhat-flatten-all');
require('./plugins/hardhat-solidity-docgen');
require('./plugins/hardhat-solidity-coverage');
require('@nomiclabs/hardhat-truffle5');
require('./plugins/hardhat-web3-accounts');
require('hardhat-gas-reporter');

const {TASK_TEST_RUN_MOCHA_TESTS} = require('hardhat/builtin-tasks/task-names');
subtask(TASK_TEST_RUN_MOCHA_TESTS, async function (args, hre, runSuper) {
  if (process.env.REPORT_GAS) {
    hre.config.mocha.grep = '@skip-on-coverage'; // Find everything with this tag
    hre.config.mocha.invert = true; // Run the grep's inverse set
  }
  return runSuper(args);
});

require('chai').should();

module.exports = {
  paths: {
    flattened: 'contracts_flattened',
  },
  solidity: {
    docgen: {
      input: 'contracts',
      templates: 'docs-template',
    },
    compilers: [
      {
        version: '0.6.8',
        settings: {
          optimizer: {
            enabled: true,
            runs: 2000,
          },
        },
      },
    ],
    overrides: {
      'contracts/mocks/token/ERC1155721/ERC1155721InventoryFullMock.sol': {
        version: '0.6.8',
        settings: {
          optimizer: {
            enabled: true,
            // lower value to reduce the size of the produced code
            runs: 200,
          },
        },
      },
    },
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS ? true : false,
  },
};

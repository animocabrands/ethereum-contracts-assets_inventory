require('@animoca/ethereum-contracts-core_library/hardhat-plugins');

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

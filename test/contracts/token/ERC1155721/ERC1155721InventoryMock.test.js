const {artifacts} = require('hardhat');
const {shouldBehaveLikeERC1155721Inventory} = require('./behaviors/ERC1155721Inventory.behavior');

const implementation = {
  contractName: 'ERC1155721InventoryMock',
  nfMaskLength: 32,
  suppliesManagement: true,
  name: 'ERC1155721InventoryMock',
  symbol: 'INV',
  revertMessages: {
    NonApproved: 'Inventory: non-approved sender',
    NonApproved_Batch: 'Inventory: non-approved sender',
    SelfApproval: 'Inventory: self-approval',
    ZeroAddress: 'Inventory: zero address',
    TransferToZero: 'Inventory: transfer to zero',
    InconsistentArrays: 'Inventory: inconsistent arrays',
    InsufficientBalance: 'Inventory: not enough balance',
    TransferRejected: 'Inventory: transfer refused',
    NonExistingNFT: 'Inventory: non-existing NFT',
    NonOwnedNFT: 'Inventory: non-owned NFT',
    transfer_NonExistingNFT: 'Inventory: non-owned NFT',
    transfer_NonOwnedNFT: 'Inventory: non-owned NFT',
    WrongNFTValue: 'Inventory: wrong NFT value',
    ZeroValue: 'Inventory: zero value',
    NotTokenId: 'Inventory: not a token id',
    NotNFT: 'Inventory: not an NFT',
    NotCollection: 'Inventory: not a collection',
    ExistingOrBurntNFT: 'Inventory: existing/burnt NFT',
    NotMinter: 'MinterRole: caller does not have the Minter role',
    SupplyOverflow: 'Inventory: supply overflow',
  },
  mint_ERC721: async function (contract, to, nftId, overrides) {
    return contract.mint(to, nftId, overrides);
  },
  // safeMint_ERC721: async function (contract, to, nftId, data, overrides) {
  //   return contract.methods['safeMint(address,uint256,bytes)'](to, nftId, data, overrides);
  // },
  batchMint_ERC721: async function (contract, to, nftIds, overrides) {
    return contract.batchMint(to, nftIds, overrides);
  },
  safeMint: async function (contract, to, id, value, data, overrides) {
    return contract.methods['safeMint(address,uint256,uint256,bytes)'](to, id, value, data, overrides);
  },
  safeBatchMint: async function (contract, to, ids, values, data, overrides) {
    return contract.safeBatchMint(to, ids, values, data, overrides);
  },
  batchTransferFrom_ERC721: async function (contract, from, to, nftIds, overrides) {
    return contract.batchTransferFrom(from, to, nftIds, overrides);
  },
  deploy: async function (deployer) {
    return artifacts.require('ERC1155721InventoryMock').new({from: deployer});
  },
  creator_ERC1155Inventory: async function (contract, collectionId, overrides) {
    return contract.creator(collectionId, overrides);
  },
};

describe('ERC1155721InventoryMock', function () {
  this.timeout(0);
  shouldBehaveLikeERC1155721Inventory(implementation);
});

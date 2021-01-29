const {artifacts} = require('hardhat');
const {shouldBehaveLikeERC721} = require('../ERC721/behaviors/ERC721.behavior');
const {shouldBehaveLikeERC1155} = require('../ERC1155/behaviors/ERC1155.behavior');

const implementation = {
  contractName: 'ERC1155721InventoryBurnableMock',
  nfMaskLength: 32,
  name: 'ERC1155721InventoryBurnableMock',
  symbol: 'INVB',
  revertMessages: {
    NonApproved: 'Inventory: non-approved sender',
    SelfApproval: 'Inventory: self-approval',
    ZeroAddress: 'Inventory: zero address',
    TransferToZero: 'Inventory: transfer to zero',
    InconsistentArrays: 'Inventory: inconsistent arrays',
    InsufficientBalance: 'Inventory: not enough balance',
    TransferRejected: 'Inventory: transfer refused',
    NonExistingNFT: 'Inventory: non-existing NFT',
    NonOwnedNFT: 'Inventory: non-owned NFT',
    WrongNFTValue: 'Inventory: wrong NFT value',
    ZeroValue: 'Inventory: zero value',
    NotToken: 'Inventory: not a token id',
    NotNFT: 'Inventory: not an NFT',
    NotCollection: 'Inventory: not a collection',
    ExistingCollection: 'Inventory: existing collection',
    ExistingOrBurntNFT: 'Inventory: existing/burnt NFT',
    NotMinter: 'MinterRole: caller does not have the Minter role',
    SupplyOverflow: 'Inventory: supply overflow',
  },
  interfaces: {ERC721: true, ERC721Metadata: true, ERC1155: true, ERC1155MetadataURI: true, ERC1155Inventory: true, ERC1155InventoryCreator: true},
  methods: {
    // ERC721
    'batchTransferFrom(address,address,uint256[])': async function (contract, from, to, nftIds, overrides) {
      return contract.batchTransferFrom(from, to, nftIds, overrides);
    },
    'mint(address,uint256)': async function (contract, to, nftId, overrides) {
      return contract.mint(to, nftId, overrides);
    },
    'safeMint(address,uint256,bytes)': async function (contract, to, nftId, data, overrides) {
      return contract.methods['safeMint(address,uint256,bytes)'](to, nftId, data, overrides);
    },
    'batchMint(address,uint256[])': async function (contract, to, nftIds, overrides) {
      return contract.batchMint(to, nftIds, overrides);
    },
    'batchBurnFrom(address,uint256[])': async function (contract, from, nftIds, overrides) {
      return contract.methods['batchBurnFrom(address,uint256[])'](from, nftIds, overrides);
    },

    // ERC1155
    'safeMint(address,uint256,uint256,bytes)': async function (contract, to, id, value, data, overrides) {
      return contract.methods['safeMint(address,uint256,uint256,bytes)'](to, id, value, data, overrides);
    },
    'safeBatchMint(address,uint256[],uint256[],bytes)': async function (contract, to, ids, values, data, overrides) {
      return contract.safeBatchMint(to, ids, values, data, overrides);
    },
    'burnFrom(address,uint256,uint256)': async function (contract, from, id, value, overrides) {
      return contract.burnFrom(from, id, value, overrides);
    },
    'batchBurnFrom(address,uint256[],uint256[])': async function (contract, from, ids, values, overrides) {
      return contract.methods['batchBurnFrom(address,uint256[],uint256[])'](from, ids, values, overrides);
    },

    // ERC1155InventoryCreator
    'createCollection(uint256)': async function (contract, collectionId, overrides) {
      return contract.createCollection(collectionId, overrides);
    },
  },
  deploy: async function (deployer) {
    return artifacts.require('ERC1155721InventoryBurnableMock').new({from: deployer});
  },
  mint: async function (contract, to, id, value, overrides) {
    return contract.methods['safeMint(address,uint256,uint256,bytes)'](to, id, value, '0x', overrides);
  },
};

describe('ERC1155721InventoryBurnableMock', function () {
  this.timeout(0);
  shouldBehaveLikeERC721(implementation);
  shouldBehaveLikeERC1155(implementation);
});

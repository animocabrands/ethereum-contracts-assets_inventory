const {artifacts} = require('hardhat');
const {shouldBehaveLikeERC721} = require('./behaviors/ERC721.behavior');

const implementation = {
  contractName: 'ERC721PausableMock',
  nfMaskLength: 32,
  name: 'ERC721Mock',
  symbol: 'E721',
  revertMessages: {
    // ERC721
    NonApproved: 'ERC721',
    SelfApproval: 'ERC721: approval to current owner',
    SelfApprovalForAll: 'ERC721: approve to caller',
    ZeroAddress: 'ERC721: balance query for the zero address',
    TransferToZero: 'ERC721: transfer to the zero address',
    MintToZero: 'ERC721: mint to the zero address',
    TransferRejected: 'ERC721: transfer to non ERC721Receiver implementer',
    NonExistingNFT: 'ERC721',
    NonOwnedNFT: 'ERC721',
    ExistingOrBurntNFT: 'ERC721: token already minted',
    NotMinter: 'ERC721: not a minter',

    // Pausable
    Paused: 'Pausable: paused',
    NotPauser: 'ERC721: not the owner',
    AlreadyPaused: 'Pausable: paused',
    AlreadyUnpaused: 'Pausable: not paused',
  },
  eventParamsOverrides: {
    Transfer: function (params) {
      return {
        from: params._from,
        to: params._to,
        tokenId: params._tokenId,
      };
    },
    Approval: function (params) {
      return {
        owner: params._owner,
        approved: params._approved,
        tokenId: params._tokenId,
      };
    },
    ApprovalForAll: function (params) {
      return {
        owner: params._owner,
        operator: params._operator,
        approved: params._approved,
      };
    },
  },
  interfaces: {ERC721: true, ERC721Metadata: true, Pausable: true},
  methods: {
    'mint(address,uint256)': async function (contract, to, nftId, overrides) {
      return contract.mint(to, nftId, overrides);
    },
    'safeMint(address,uint256,bytes)': async function (contract, to, nftId, data, overrides) {
      return contract.methods['safeMint(address,uint256,bytes)'](to, nftId, data, overrides);
    },
  },
  deploy: async function (deployer) {
    return artifacts.require('ERC721PausableMock').new({from: deployer});
  },
  mint: async function (contract, to, id, _value, overrides) {
    return contract.methods['safeMint(address,uint256,bytes)'](to, id, '0x', overrides);
  },
};

describe('ERC721PausableMock', function () {
  this.timeout(0);
  shouldBehaveLikeERC721(implementation);
});

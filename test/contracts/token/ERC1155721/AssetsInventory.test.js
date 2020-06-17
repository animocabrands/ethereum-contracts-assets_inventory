const { contract, accounts } = require('@openzeppelin/test-environment');

const { shouldBehaveLikeERC721 } = require('../ERC721/behaviors/ERC721.behavior');
const { shouldBehaveLikeERC721Metadata } = require('../ERC721/behaviors/ERC721Metadata.behavior');
const { shouldBehaveLikeERC1155MetadataURI } = require('../ERC1155/behaviors/ERC1155MetadataURI.behavior');
const { shouldBehaveLikeERC1155AssetsInventory } = require('../ERC1155/behaviors/ERC1155AssetsInventory.behavior');
const { shouldBehaveLikeERC1155MintableInventory } = require('../ERC1155/behaviors/ERC1155MintableInventory.behavior');
const { shouldBehaveLikeAssetsInventory } = require('./behaviors/AssetsInventory.behavior');

const AssetsInventory = contract.fromArtifact('AssetsInventoryMock');

describe('AssetsInventory', function () {
  const [creator, ...otherAccounts] = accounts;
  const nfMaskLength = 32;

  beforeEach(async function () {
    this.token = await AssetsInventory.new(nfMaskLength, { from: creator });
  });

  shouldBehaveLikeERC721(nfMaskLength, creator, otherAccounts);
  shouldBehaveLikeERC721Metadata(nfMaskLength, "AssetsInventoryMock", "AIM", creator, otherAccounts);
  shouldBehaveLikeERC1155AssetsInventory(nfMaskLength, creator, otherAccounts);
  shouldBehaveLikeERC1155MintableInventory(nfMaskLength, creator, otherAccounts);
  shouldBehaveLikeERC1155MetadataURI(nfMaskLength, creator, otherAccounts);
  shouldBehaveLikeAssetsInventory(nfMaskLength, creator, otherAccounts);
});


const { contract, accounts } = require('@openzeppelin/test-environment');

const { shouldBehaveLikeERC721 } = require('../ERC721/behaviors/ERC721.behavior');
const { shouldBehaveLikeERC721Metadata } = require('../ERC721/behaviors/ERC721Metadata.behavior');
const { shouldBehaveLikeERC721Pausable } = require('../ERC721/behaviors/ERC721Pausable.behavior');
const { shouldBehaveLikeERC1155AssetsInventory } = require('../ERC1155/behaviors/ERC1155AssetsInventory.behavior');
const { shouldBehaveLikeERC1155MetadataURI } = require('../ERC1155/behaviors/ERC1155MetadataURI.behavior');
const { shouldBehaveLikeERC1155PausableInventory } = require('../ERC1155/behaviors/ERC1155PausableInventory.behavior');
const { shouldBehaveLikeAssetsInventory } = require('./behaviors/AssetsInventory.behavior');
const { shouldBehaveLikeBurnableInventory } = require('./behaviors/BurnableInventory.behavior');

const PausableInventoryMock = contract.fromArtifact('PausableInventoryMock');

describe('PausableInventory', function () {
  const [creator, ...otherAccounts] = accounts;
  const nfMaskLength = 32;

  beforeEach(async function () {
    this.token = await PausableInventoryMock.new(nfMaskLength, { from: creator });
  });

  shouldBehaveLikeERC721(nfMaskLength, creator, otherAccounts);
  shouldBehaveLikeERC721Metadata(nfMaskLength, "PausableInventoryMock", "PIM", creator, otherAccounts);
  shouldBehaveLikeERC721Pausable(nfMaskLength, creator, otherAccounts);
  shouldBehaveLikeERC1155AssetsInventory(nfMaskLength, creator, otherAccounts);
  shouldBehaveLikeERC1155MetadataURI(nfMaskLength, creator, otherAccounts);
  shouldBehaveLikeERC1155PausableInventory(nfMaskLength, creator, otherAccounts);
  shouldBehaveLikeAssetsInventory(nfMaskLength, creator, otherAccounts);
  shouldBehaveLikeBurnableInventory(nfMaskLength, creator, otherAccounts);
});

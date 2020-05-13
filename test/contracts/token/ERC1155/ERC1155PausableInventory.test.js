const { contract, accounts } = require('@openzeppelin/test-environment');

const { shouldBehaveLikeERC1155AssetsInventory } = require('./behaviors/ERC1155AssetsInventory.behavior');
const { shouldBehaveLikeERC1155BurnableInventory } = require('./behaviors/ERC1155BurnableInventory.behavior');
const { shouldBehaveLikeERC1155MetadataURI } = require('./behaviors/ERC1155MetadataURI.behavior');
const { shouldBehaveLikeERC1155PausableInventory } = require('./behaviors/ERC1155PausableInventory.behavior');

const ERC1155PausableInventoryMock = contract.fromArtifact('ERC1155PausableInventoryMock');

describe('ERC1155BurnableInventory', function () {
  const [creator, ...otherAccounts] = accounts;
  const nfMaskLength = 32;

  beforeEach(async function () {
    this.token = await ERC1155PausableInventoryMock.new(nfMaskLength, { from: creator });
  });

  shouldBehaveLikeERC1155AssetsInventory(nfMaskLength, creator, otherAccounts);
  shouldBehaveLikeERC1155BurnableInventory(nfMaskLength, creator, otherAccounts);
  shouldBehaveLikeERC1155PausableInventory(nfMaskLength, creator, otherAccounts);
  shouldBehaveLikeERC1155MetadataURI(nfMaskLength);
});

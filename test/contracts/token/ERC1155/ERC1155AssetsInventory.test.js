const { contract, accounts } = require('@openzeppelin/test-environment');

const { shouldBehaveLikeERC1155AssetsInventory } = require('./behaviors/ERC1155AssetsInventory.behavior');
const { shouldBehaveLikeERC1155MetadataURI } = require('./behaviors/ERC1155MetadataURI.behavior');

const ERC1155AssetsInventoryMock = contract.fromArtifact('ERC1155AssetsInventoryMock');

describe('ERC1155AssetsInventory', function () {
  const [creator, ...otherAccounts] = accounts;
  const nfMaskLength = 32;

  beforeEach(async function () {
    this.token = await ERC1155AssetsInventoryMock.new(nfMaskLength, { from: creator });
  });

  shouldBehaveLikeERC1155AssetsInventory(nfMaskLength, creator, otherAccounts);
  shouldBehaveLikeERC1155MetadataURI(nfMaskLength);
});


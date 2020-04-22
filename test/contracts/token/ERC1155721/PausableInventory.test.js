const { contract, accounts } = require('@openzeppelin/test-environment');

const { shouldBehaveLikeAssetsInventory } = require('./AssetsInventory.behavior');
const { shouldBehaveLikeAssetsInventoryPaused } = require('./AssetsInventoryPaused.behavior');
const { shouldBehaveLikeERC1155PausableCollections } = require('../ERC1155/ERC1155PausableCollections.behavior');

const NonBurnablePausableInventoryMock = contract.fromArtifact('NonBurnablePausableInventoryMock');

describe('PausableInventory', function () {
  const [creator, ...otherAccounts] = accounts;
  const nfMaskLength = 32;

  beforeEach(async function () {
    this.token = await NonBurnablePausableInventoryMock.new(nfMaskLength, { from: creator });
  });

  describe('Pausable', function () {

    context("when not paused", async function () {
      shouldBehaveLikeAssetsInventory(nfMaskLength, creator, otherAccounts, "NonBurnablePausableInventoryMock", "NBPIM");
    });

    context("when paused", async function () {
      beforeEach(async function () {
        await this.token.pause({ from: creator });
      });
      shouldBehaveLikeAssetsInventoryPaused(nfMaskLength, creator, otherAccounts , "NonBurnablePausableInventoryMock", "NBPIM");
    });
  });

  shouldBehaveLikeERC1155PausableCollections(nfMaskLength, creator, otherAccounts);
});

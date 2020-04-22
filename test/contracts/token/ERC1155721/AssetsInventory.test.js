const { contract, accounts } = require('@openzeppelin/test-environment');

const { shouldBehaveLikeAssetsInventory } = require('./AssetsInventory.behavior');
const { shouldBehaveLikeAssetsInventoryBurnable } = require('./AssetsInventoryBurnable.behavior');

const AssetsInventoryMock = contract.fromArtifact('AssetsInventoryMock');
const NonBurnableInventoryMock = contract.fromArtifact('NonBurnableInventoryMock');

describe('AssetsInventory', function () {
  const [creator, ...otherAccounts] = accounts;
  const nfMaskLength = 32;

  // TODO add comment explaining why semantic is reversed

  context('like a non-burnable assets inventory', function () {
      beforeEach(async function () {
        this.token = await NonBurnableInventoryMock.new(nfMaskLength, { from: creator });
      });

      shouldBehaveLikeAssetsInventory(nfMaskLength, creator, otherAccounts, "NonBurnableInventoryMock", "NBIM");
  });

  context('like a burnable assets inventory', function () {
      beforeEach(async function () {
        this.token = await AssetsInventoryMock.new(nfMaskLength, { from: creator });
      });

      shouldBehaveLikeAssetsInventoryBurnable(nfMaskLength, creator, otherAccounts, "AssetsInventoryMock", "AIM");
  });
});

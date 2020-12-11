const { contract, accounts } = require('@openzeppelin/test-environment');
const { shouldBehaveLikeERC1155PausableInventory } = require('../ERC1155/behaviors/ERC1155PausableInventory.behavior');

const PausableInventory = contract.fromArtifact('PausableInventoryMock');

describe('old_ERC1155721PausableInventory', function () {
  const [creator, ...otherAccounts] = accounts;
  const nfMaskLength = 32;

  beforeEach(async function () {
    this.token = await PausableInventory.new(nfMaskLength, { from: creator });
  });

  shouldBehaveLikeERC1155PausableInventory(nfMaskLength, creator, otherAccounts);
});

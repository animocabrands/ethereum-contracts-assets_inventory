const { contract, accounts } = require('@openzeppelin/test-environment');
const { shouldBehaveLikeERC1155PausableInventory } = require('./behaviors/ERC1155PausableInventory.behavior');

const ERC1155PausableInventory = contract.fromArtifact('ERC1155PausableInventoryMock');

describe('old_ERC1155PausableInventory', function () {
  const [creator, ...otherAccounts] = accounts;
  const nfMaskLength = 32;

  beforeEach(async function () {
    this.token = await ERC1155PausableInventory.new(nfMaskLength, { from: creator });
  });

  shouldBehaveLikeERC1155PausableInventory(nfMaskLength, creator, otherAccounts);
});

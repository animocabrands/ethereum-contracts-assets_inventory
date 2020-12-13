const { contract, accounts } = require('@openzeppelin/test-environment');
const { shouldBehaveLikeERC1155PausableInventory } = require('./behaviors/ERC1155PausableInventory.behavior');

const implementation = require('./implementations/old_ERC1155PausableInventory');
const ERC1155PausableInventory = contract.fromArtifact('ERC1155PausableInventoryMock');

describe('old_ERC1155PausableInventory', function () {
  const [creator] = accounts;

  beforeEach(async function () {
    this.token = await ERC1155PausableInventory.new(implementation.nfMaskLength, { from: creator });
  });

  shouldBehaveLikeERC1155PausableInventory(implementation, accounts);
});

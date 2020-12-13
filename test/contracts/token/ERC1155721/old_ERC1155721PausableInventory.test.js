const { contract, accounts } = require('@openzeppelin/test-environment');
const { shouldBehaveLikeERC1155PausableInventory } = require('../ERC1155/behaviors/ERC1155PausableInventory.behavior');

const implementation = require('./implementations/old_ERC1155721PausableInventory');
const PausableInventory = contract.fromArtifact(implementation.contract);

describe('old_ERC1155721PausableInventory', function () {
  const [creator, ...otherAccounts] = accounts;

  beforeEach(async function () {
    this.token = await PausableInventory.new(implementation.nfMaskLength, { from: creator });
  });

  shouldBehaveLikeERC1155PausableInventory(implementation, accounts);
});

const { contract, accounts } = require('@openzeppelin/test-environment');
const { behaviors, interfaces } = require('@animoca/ethereum-contracts-core_library');
const interfaces1155 = require('../../../../src/interfaces/ERC165/ERC1155');

const { shouldBehaveLikeERC1155 } = require('./behaviors/ERC1155.behavior');
const { shouldBehaveLikeERC1155Inventory } = require('./behaviors/ERC1155Inventory.behavior');
const { shouldBehaveLikeERC1155MintableInventory } = require('./behaviors/ERC1155MintableInventory.behavior');
const { shouldBehaveLikeERC1155BurnableInventory } = require('./behaviors/ERC1155BurnableInventory.behavior');
const { shouldBehaveLikeERC1155MetadataURI } = require('./behaviors/ERC1155MetadataURI.behavior');

const implementation = require('./implementations/ERC1155Inventory');
const ERC1155Inventory = contract.fromArtifact(implementation.contract);

describe('ERC1155Inventory', function () {
  const [creator] = accounts;

  beforeEach(async function () {
    this.token = await ERC1155Inventory.new({ from: creator });
  });

  shouldBehaveLikeERC1155(implementation, accounts);
  shouldBehaveLikeERC1155Inventory(implementation, accounts);
  shouldBehaveLikeERC1155MintableInventory(implementation, accounts);
  shouldBehaveLikeERC1155BurnableInventory(implementation, accounts);
  shouldBehaveLikeERC1155MetadataURI(implementation, accounts);

  describe('ERC165 interfaces support', function () {
    behaviors.shouldSupportInterfaces([
      interfaces1155.ERC1155Inventory_Experimental
    ]);
  });
});


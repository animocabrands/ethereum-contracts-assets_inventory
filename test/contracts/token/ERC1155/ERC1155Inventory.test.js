const { contract, accounts } = require('@openzeppelin/test-environment');
const { behaviors, interfaces } = require('@animoca/ethereum-contracts-core_library');
const interfaces1155 = require('../../../../src/interfaces/ERC165/ERC1155');

const { shouldBehaveLikeERC1155 } = require('./behaviors/ERC1155.behavior');
const { shouldBehaveLikeERC1155Inventory } = require('./behaviors/ERC1155Inventory.behavior');
const { shouldBehaveLikeERC1155MintableInventory } = require('./behaviors/ERC1155MintableInventory.behavior');
const { shouldBehaveLikeERC1155BurnableInventory } = require('./behaviors/ERC1155BurnableInventory.behavior');
const { shouldBehaveLikeERC1155MetadataURI } = require('./behaviors/ERC1155MetadataURI.behavior');

const ERC1155Inventory = contract.fromArtifact('ERC1155InventoryMock');
const impl = require('./implementations/ERC1155Inventory');

describe('ERC1155Inventory', function () {
  const [creator, ...otherAccounts] = accounts;

  beforeEach(async function () {
    this.token = await ERC1155Inventory.new({ from: creator });
  });

  shouldBehaveLikeERC1155(impl.newABI, creator, otherAccounts, impl.revertMessages);
  shouldBehaveLikeERC1155Inventory(impl.nfMaskLength, impl.newABI, creator, otherAccounts);
  shouldBehaveLikeERC1155MintableInventory(impl.nfMaskLength, impl.newABI, creator, otherAccounts);

  shouldBehaveLikeERC1155BurnableInventory(impl.nfMaskLength, impl.newABI, creator, otherAccounts, impl.revertMessages);
  shouldBehaveLikeERC1155MetadataURI(impl.nfMaskLength);

  describe('ERC165 interfaces support', function () {
    behaviors.shouldSupportInterfaces([
      interfaces1155.ERC1155Inventory_Experimental
    ]);
  });
});


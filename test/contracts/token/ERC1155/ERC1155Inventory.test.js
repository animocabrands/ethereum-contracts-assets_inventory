const { contract, accounts } = require('@openzeppelin/test-environment');
const { behaviors, interfaces } = require('@animoca/ethereum-contracts-core_library');
const interfaces1155 = require('../../../../src/interfaces/ERC165/ERC1155');

const { shouldBehaveLikeERC1155Inventory } = require('./behaviors/ERC1155Inventory.behavior');
const { shouldBehaveLikeERC1155MintableInventory } = require('./behaviors/ERC1155MintableInventory.behavior');
const { shouldBehaveLikeERC1155BurnableInventory } = require('./behaviors/ERC1155BurnableInventory.behavior');
const { shouldBehaveLikeERC1155MetadataURI } = require('./behaviors/ERC1155MetadataURI.behavior');

const ERC1155Inventory = contract.fromArtifact('ERC1155InventoryMock');
const newABI = true;

describe('ERC1155Inventory', function () {
  const [creator, ...otherAccounts] = accounts;
  const nfMaskLength = 32;

  beforeEach(async function () {
    this.token = await ERC1155Inventory.new({ from: creator });
  });

  shouldBehaveLikeERC1155Inventory(nfMaskLength, newABI, creator, otherAccounts);
  shouldBehaveLikeERC1155MintableInventory(nfMaskLength, newABI, creator, otherAccounts);

  shouldBehaveLikeERC1155BurnableInventory(nfMaskLength, newABI, accounts, [
      'Inventory: non-owned NFT',
      'Inventory: non-approved sender',
      'Inventory: non-existing NFT'
    ]);
  shouldBehaveLikeERC1155MetadataURI(nfMaskLength);

  describe('ERC165 interfaces support', function () {
    behaviors.shouldSupportInterfaces([
      interfaces.ERC165,
      interfaces1155.ERC1155,
      interfaces1155.ERC1155Inventory_Experimental
    ]);
  });
});


const { contract, accounts } = require('@openzeppelin/test-environment');
const { behaviors, interfaces } = require('@animoca/ethereum-contracts-core_library');
const interfaces1155 = require('../../../../src/interfaces/ERC165/ERC1155');

const { shouldBehaveLikeERC721 } = require('../ERC721/behaviors/ERC721.behavior');
const { shouldBehaveLikeERC721Metadata } = require('../ERC721/behaviors/ERC721Metadata.behavior');
const { shouldBehaveLikeERC1155 } = require('../ERC1155/behaviors/ERC1155.behavior');
const { shouldBehaveLikeERC1155Inventory } = require('../ERC1155/behaviors/ERC1155Inventory.behavior');
const { shouldBehaveLikeERC1155BurnableInventory } = require('../ERC1155/behaviors/ERC1155BurnableInventory.behavior');
const { shouldBehaveLikeERC1155MintableInventory } = require('../ERC1155/behaviors/ERC1155MintableInventory.behavior');
const { shouldBehaveLikeERC1155MetadataURI } = require('../ERC1155/behaviors/ERC1155MetadataURI.behavior');
const { shouldBehaveLikeERC1155721Inventory } = require('./behaviors/ERC1155721Inventory.behavior');
const { shouldBehaveLikeERC1155721MintableInventory } = require('./behaviors/ERC1155721MintableInventory.behavior');
const { shouldBehaveLikeERC1155721BurnableInventory } = require('./behaviors/ERC1155721BurnableInventory.behavior');

const ERC1155721Inventory = contract.fromArtifact('ERC1155721InventoryMock');
const impl = require('./implementations/ERC1155721Inventory');

describe('ERC1155721Inventory', function () {
  const [creator, ...otherAccounts] = accounts;

  beforeEach(async function () {
    this.token = await ERC1155721Inventory.new({ from: creator });
  });


  shouldBehaveLikeERC721(impl.nfMaskLength, impl.newABI, creator, otherAccounts);
  shouldBehaveLikeERC721Metadata(impl.nfMaskLength, impl.name, impl.symbol, impl.newABI, creator, otherAccounts);
  shouldBehaveLikeERC1155(impl.newABI, creator, otherAccounts, impl.revertMessages);
  shouldBehaveLikeERC1155Inventory(impl.nfMaskLength, impl.newABI, creator, otherAccounts);
  shouldBehaveLikeERC1155MintableInventory(impl.nfMaskLength, impl.newABI, creator, otherAccounts);
  shouldBehaveLikeERC1155BurnableInventory(impl.nfMaskLength, impl.newABI, creator, otherAccounts, impl.revertMessages);
  shouldBehaveLikeERC1155MetadataURI(impl.nfMaskLength);
  shouldBehaveLikeERC1155721Inventory(impl.nfMaskLength, impl.newABI, creator, otherAccounts);
  shouldBehaveLikeERC1155721MintableInventory(impl.nfMaskLength, impl.newABI, creator, otherAccounts);
  shouldBehaveLikeERC1155721BurnableInventory(impl.nfMaskLength, impl.newABI, creator, otherAccounts, impl.revertMessages);

  describe('ERC165 interfaces support', function () {
    behaviors.shouldSupportInterfaces([
      interfaces.ERC165,
      interfaces1155.ERC1155,
      interfaces1155.ERC1155Inventory_Experimental
    ]);
  });
});


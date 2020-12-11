const { contract, accounts } = require('@openzeppelin/test-environment');
const { behaviors, interfaces } = require('@animoca/ethereum-contracts-core_library');
const interfaces1155 = require('../../../../src/interfaces/ERC165/ERC1155');

const { shouldBehaveLikeERC721 } = require('../ERC721/behaviors/ERC721.behavior');
const { shouldBehaveLikeERC721Metadata } = require('../ERC721/behaviors/ERC721Metadata.behavior');
const { shouldBehaveLikeERC1155Inventory } = require('../ERC1155/behaviors/ERC1155Inventory.behavior');
const { shouldBehaveLikeERC1155BurnableInventory } = require('../ERC1155/behaviors/ERC1155BurnableInventory.behavior');
const { shouldBehaveLikeERC1155MintableInventory } = require('../ERC1155/behaviors/ERC1155MintableInventory.behavior');
const { shouldBehaveLikeERC1155MetadataURI } = require('../ERC1155/behaviors/ERC1155MetadataURI.behavior');
const { shouldBehaveLikeERC1155721Inventory } = require('./behaviors/ERC1155721Inventory.behavior');
const { shouldBehaveLikeERC1155721MintableInventory } = require('./behaviors/ERC1155721MintableInventory.behavior');
const { shouldBehaveLikeERC1155721BurnableInventory } = require('./behaviors/ERC1155721BurnableInventory.behavior');

const ERC1155721Inventory = contract.fromArtifact('ERC1155721InventoryMock');
const newABI = true;

describe('ERC1155721Inventory', function () {
  const [creator, ...otherAccounts] = accounts;
  const nfMaskLength = 32;

  beforeEach(async function () {
    this.token = await ERC1155721Inventory.new({ from: creator });
  });


  shouldBehaveLikeERC721(nfMaskLength, newABI, creator, otherAccounts);
  shouldBehaveLikeERC721Metadata(nfMaskLength, "ERC1155721InventoryMock", "INV", true, creator, otherAccounts);
  shouldBehaveLikeERC1155Inventory(nfMaskLength, newABI, creator, otherAccounts);
  shouldBehaveLikeERC1155MintableInventory(nfMaskLength, newABI, creator, otherAccounts);
  shouldBehaveLikeERC1155BurnableInventory(nfMaskLength, newABI, creator, otherAccounts, [
    'Inventory: non-owned NFT',
    'Inventory: non-approved sender',
    'Inventory: non-existing NFT'
  ]);
  shouldBehaveLikeERC1155MetadataURI(nfMaskLength);
  shouldBehaveLikeERC1155721Inventory(nfMaskLength, newABI, creator, otherAccounts);
  shouldBehaveLikeERC1155721MintableInventory(nfMaskLength, newABI, creator, otherAccounts);
  shouldBehaveLikeERC1155721BurnableInventory(nfMaskLength, newABI, creator, otherAccounts);

  describe('ERC165 interfaces support', function () {
    behaviors.shouldSupportInterfaces([
      interfaces.ERC165,
      interfaces1155.ERC1155,
      interfaces1155.ERC1155Inventory_Experimental
    ]);
  });
});


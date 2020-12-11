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

const BurnableInventory = contract.fromArtifact('BurnableInventoryMock');
const newABI = false;

describe('old_ERC1155721Inventory', function () {
  const [creator, ...otherAccounts] = accounts;
  const nfMaskLength = 32;

  beforeEach(async function () {
    this.token = await BurnableInventory.new(nfMaskLength, { from: creator });
  });

  shouldBehaveLikeERC721(nfMaskLength, newABI, creator, otherAccounts);
  shouldBehaveLikeERC721Metadata(nfMaskLength, "AssetsInventoryMock", "AIM", false, creator, otherAccounts);
  shouldBehaveLikeERC1155Inventory(nfMaskLength, newABI, creator, otherAccounts);
  shouldBehaveLikeERC1155BurnableInventory(nfMaskLength, newABI, creator, otherAccounts, [
    'ERC1155: transfer of a non-owned NFT',
    'ERC1155: transfer by a non-approved sender',
    'ERC1155: owner of non-existing NFT'
  ]);
  shouldBehaveLikeERC1155MintableInventory(nfMaskLength, newABI, creator, otherAccounts);
  shouldBehaveLikeERC1155MetadataURI(nfMaskLength, creator, otherAccounts);
  shouldBehaveLikeERC1155721Inventory(nfMaskLength, newABI, creator, otherAccounts);
  shouldBehaveLikeERC1155721MintableInventory(nfMaskLength, newABI, creator, otherAccounts);
  shouldBehaveLikeERC1155721BurnableInventory(nfMaskLength, newABI, creator, otherAccounts, [
    'ERC1155: transfer of a non-owned NFT',
    'ERC1155: transfer by a non-approved sender',    
    'ERC1155: owner of non-existing NFT',
  ]);

  describe('ERC165 interfaces support', function () {
    behaviors.shouldSupportInterfaces([
      interfaces.ERC165,
      interfaces1155.ERC1155,
      interfaces1155.ERC1155AssetCollections_Experimental
    ]);
  });
});

const { contract, accounts } = require('@openzeppelin/test-environment');
const { behaviors, interfaces } = require('@animoca/ethereum-contracts-core_library');
const interfaces1155 = require('../../../../src/interfaces/ERC165/ERC1155');

const { shouldBehaveLikeERC1155Inventory } = require('./behaviors/ERC1155Inventory.behavior');
const { shouldBehaveLikeERC1155BurnableInventory } = require('./behaviors/ERC1155BurnableInventory.behavior');
const { shouldBehaveLikeERC1155MintableInventory } = require('./behaviors/ERC1155MintableInventory.behavior');
const { shouldBehaveLikeERC1155MetadataURI } = require('./behaviors/ERC1155MetadataURI.behavior');

const ERC1155BurnableInventory = contract.fromArtifact('ERC1155BurnableInventoryMock');
const newABI = false;

describe('old_ERC1155Inventory', function () {
  const [creator, ...otherAccounts] = accounts;
  const nfMaskLength = 32;

  beforeEach(async function () {
    this.token = await ERC1155BurnableInventory.new(nfMaskLength, { from: creator });
  });

  shouldBehaveLikeERC1155Inventory(nfMaskLength, newABI, creator, otherAccounts);
  shouldBehaveLikeERC1155MintableInventory(nfMaskLength, newABI, creator, otherAccounts);
  shouldBehaveLikeERC1155BurnableInventory(nfMaskLength, newABI, creator, otherAccounts, [
    'ERC1155: transfer of a non-owned NFT',
    'ERC1155: transfer by a non-approved sender',
    'ERC1155: owner of non-existing NFT'
  ]);
  shouldBehaveLikeERC1155MetadataURI(nfMaskLength);

  describe('ERC165 interfaces support', function () {
    behaviors.shouldSupportInterfaces([
      interfaces.ERC165,
      interfaces1155.ERC1155,
      interfaces1155.ERC1155AssetCollections_Experimental
    ]);
  });
});

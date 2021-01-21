const {behaviors} = require('@animoca/ethereum-contracts-core_library');
const interfaces1155 = require('../../../../../src/interfaces/ERC165/ERC1155');

const {shouldBehaveLikeERC1155} = require('./ERC1155.behavior');
const {shouldBehaveLikeERC1155StandardInventory} = require('./ERC1155StandardInventory.behavior');
const {shouldBehaveLikeERC1155MintableInventory} = require('./ERC1155MintableInventory.behavior');
const {shouldBehaveLikeERC1155BurnableInventory} = require('./ERC1155BurnableInventory.behavior');
const {shouldBehaveLikeERC1155MetadataURI} = require('./ERC1155MetadataURI.behavior');

function shouldBehaveLikeERC1155Inventory(implementation) {
  describe('like a ERC1155Inventory', function () {
    shouldBehaveLikeERC1155(implementation);
    shouldBehaveLikeERC1155StandardInventory(implementation);
    shouldBehaveLikeERC1155MintableInventory(implementation);
    shouldBehaveLikeERC1155BurnableInventory(implementation);
    shouldBehaveLikeERC1155MetadataURI(implementation);

    describe('ERC165 interfaces support', function () {
      beforeEach(async function () {
        this.token = await implementation.deploy();
      });
      behaviors.shouldSupportInterfaces([interfaces1155.ERC1155Inventory_Experimental]);
    });
  });
}

module.exports = {
  shouldBehaveLikeERC1155Inventory,
};

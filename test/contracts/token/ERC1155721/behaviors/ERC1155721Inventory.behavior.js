const {behaviors, interfaces} = require('@animoca/ethereum-contracts-core_library');
const interfaces1155 = require('../../../../../src/interfaces/ERC165/ERC1155');

const {shouldBehaveLikeERC721} = require('../../ERC721/behaviors/ERC721.behavior');
const {shouldBehaveLikeERC721Mintable} = require('../../ERC721/behaviors/ERC721Mintable.behavior');
const {shouldBehaveLikeERC721Metadata} = require('../../ERC721/behaviors/ERC721Metadata.behavior');
const {shouldBehaveLikeERC1155} = require('../../ERC1155/behaviors/ERC1155.behavior');
const {shouldBehaveLikeERC1155StandardInventory} = require('../../ERC1155/behaviors/ERC1155StandardInventory.behavior');
const {shouldBehaveLikeERC1155BurnableInventory} = require('../../ERC1155/behaviors/ERC1155BurnableInventory.behavior');
const {shouldBehaveLikeERC1155MintableInventory} = require('../../ERC1155/behaviors/ERC1155MintableInventory.behavior');
const {shouldBehaveLikeERC1155MetadataURI} = require('../../ERC1155/behaviors/ERC1155MetadataURI.behavior');
const {shouldBehaveLikeERC1155721StandardInventory} = require('./ERC1155721StandardInventory.behavior');
const {shouldBehaveLikeERC1155721MintableInventory} = require('./ERC1155721MintableInventory.behavior');
const {shouldBehaveLikeERC1155721BurnableInventory} = require('./ERC1155721BurnableInventory.behavior');

function shouldBehaveLikeERC1155721Inventory(implementation) {
  describe('like an ERC1155721Inventory', function () {
    shouldBehaveLikeERC721(implementation);
    shouldBehaveLikeERC721Mintable(implementation);
    shouldBehaveLikeERC721Metadata(implementation);
    shouldBehaveLikeERC1155(implementation);
    shouldBehaveLikeERC1155StandardInventory(implementation);
    shouldBehaveLikeERC1155MintableInventory(implementation);
    shouldBehaveLikeERC1155BurnableInventory(implementation);
    shouldBehaveLikeERC1155MetadataURI(implementation);
    shouldBehaveLikeERC1155721StandardInventory(implementation);
    shouldBehaveLikeERC1155721MintableInventory(implementation);
    shouldBehaveLikeERC1155721BurnableInventory(implementation);

    describe('ERC165 interfaces support', function () {
      behaviors.shouldSupportInterfaces([interfaces1155.ERC1155Inventory_Experimental]);
    });
  });
}

module.exports = {
  shouldBehaveLikeERC1155721Inventory,
};

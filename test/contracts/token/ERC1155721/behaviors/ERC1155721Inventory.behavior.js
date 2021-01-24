const {behaviors, interfaces} = require('@animoca/ethereum-contracts-core_library');
const interfaces1155 = require('../../../../../src/interfaces/ERC165/ERC1155');

const {shouldBehaveLikeERC721} = require('../../ERC721/behaviors/ERC721.behavior');
const {shouldBehaveLikeERC721Mintable} = require('../../ERC721/behaviors/ERC721Mintable.behavior');
const {shouldBehaveLikeERC721Metadata} = require('../../ERC721/behaviors/ERC721Metadata.behavior');
const {shouldBehaveLikeERC1155} = require('../../ERC1155/behaviors/ERC1155.behavior');
const {shouldBehaveLikeERC1155StandardInventory} = require('../../ERC1155/behaviors/ERC1155StandardInventory.behavior');
const {shouldBehaveLikeERC1155InventoryBurnable} = require('../../ERC1155/behaviors/ERC1155InventoryBurnable.behavior');
const {shouldBehaveLikeERC1155InventoryMintable} = require('../../ERC1155/behaviors/ERC1155InventoryMintable.behavior');
const {shouldBehaveLikeERC1155MetadataURI} = require('../../ERC1155/behaviors/ERC1155MetadataURI.behavior');
const {shouldBehaveLikeERC1155InventoryCreator} = require('../../ERC1155/behaviors/ERC1155InventoryCreator.behavior');
const {shouldBehaveLikeERC1155721StandardInventory} = require('./ERC1155721StandardInventory.behavior');
const {shouldBehaveLikeERC1155721InventoryMintable} = require('./ERC1155721InventoryMintable.behavior');
const {shouldBehaveLikeERC1155721InventoryBurnable} = require('./ERC1155721InventoryBurnable.behavior');

function shouldBehaveLikeERC1155721Inventory(implementation) {
  describe('like an ERC1155721Inventory', function () {
    shouldBehaveLikeERC721(implementation);
    shouldBehaveLikeERC721Mintable(implementation);
    shouldBehaveLikeERC721Metadata(implementation);
    shouldBehaveLikeERC1155(implementation);
    shouldBehaveLikeERC1155StandardInventory(implementation);
    shouldBehaveLikeERC1155InventoryMintable(implementation);
    shouldBehaveLikeERC1155InventoryBurnable(implementation);
    shouldBehaveLikeERC1155MetadataURI(implementation);
    shouldBehaveLikeERC1155InventoryCreator(implementation);
    shouldBehaveLikeERC1155721StandardInventory(implementation);
    shouldBehaveLikeERC1155721InventoryMintable(implementation);
    shouldBehaveLikeERC1155721InventoryBurnable(implementation);

    describe('ERC165 interfaces support', function () {
      beforeEach(async function () {
        this.token = await implementation.deploy();
      });
      behaviors.shouldSupportInterfaces([interfaces1155.ERC1155Inventory_Experimental]);
    });
  });
}

module.exports = {
  shouldBehaveLikeERC1155721Inventory,
};

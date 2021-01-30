const {shouldBehaveLikeERC1155Standard} = require('./ERC1155.standard.behavior');
const {shouldBehaveLikeERC1155Mintable} = require('./ERC1155.mintable.behavior');
const {shouldBehaveLikeERC1155Burnable} = require('./ERC1155.burnable.behavior');
const {shouldBehaveLikeERC1155MetadataURI} = require('./ERC1155MetadataURI.behavior');
const {shouldBehaveLikeERC1155Inventory} = require('./ERC1155Inventory.behavior');
const {shouldBehaveLikeERC1155InventoryCreator} = require('./ERC1155InventoryCreator.behavior');
const {shouldBehaveLikePausableContract} = require('@animoca/ethereum-contracts-core_library/test/contracts/utils/Pausable.behavior');

function shouldBehaveLikeERC1155(implementation) {
  describe('like an ERC1155', function () {
    shouldBehaveLikeERC1155Standard(implementation);
    shouldBehaveLikeERC1155Mintable(implementation);
    shouldBehaveLikeERC1155Burnable(implementation);
    if (implementation.interfaces.ERC1155MetadataURI) {
      shouldBehaveLikeERC1155MetadataURI(implementation);
    }
    if (implementation.interfaces.ERC1155Inventory) {
      shouldBehaveLikeERC1155Inventory(implementation);
    }
    if (implementation.interfaces.ERC1155InventoryCreator) {
      shouldBehaveLikeERC1155InventoryCreator(implementation);
    }

    if (implementation.interfaces.Pausable) {
      shouldBehaveLikePausableContract(implementation);
    }
  });
}

module.exports = {
  shouldBehaveLikeERC1155,
};

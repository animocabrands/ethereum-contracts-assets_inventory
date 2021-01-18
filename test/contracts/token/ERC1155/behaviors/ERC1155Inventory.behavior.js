const { behaviors } = require("@animoca/ethereum-contracts-core_library");
const interfaces1155 = require("../../../../../src/interfaces/ERC165/ERC1155");

const { shouldBehaveLikeERC1155 } = require("./ERC1155.behavior");
const { shouldBehaveLikeERC1155StandardInventory } = require("./ERC1155StandardInventory.behavior");
const { shouldBehaveLikeERC1155MintableInventory } = require("./ERC1155MintableInventory.behavior");
const { shouldBehaveLikeERC1155BurnableInventory } = require("./ERC1155BurnableInventory.behavior");
const { shouldBehaveLikeERC1155MetadataURI } = require("./ERC1155MetadataURI.behavior");

function shouldBehaveLikeERC1155Inventory(implementation, accounts) {
    describe("like a ERC1155Inventory", function() {
        shouldBehaveLikeERC1155(implementation, accounts);
        shouldBehaveLikeERC1155StandardInventory(implementation, accounts);
        shouldBehaveLikeERC1155MintableInventory(implementation, accounts);
        shouldBehaveLikeERC1155BurnableInventory(implementation, accounts);
        shouldBehaveLikeERC1155MetadataURI(implementation, accounts);

        describe("ERC165 interfaces support", function() {
            behaviors.shouldSupportInterfaces([interfaces1155.ERC1155Inventory_Experimental]);
        });
    });
}

module.exports = {
    shouldBehaveLikeERC1155Inventory
};

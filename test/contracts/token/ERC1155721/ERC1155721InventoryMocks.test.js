const { contract, accounts } = require("@openzeppelin/test-environment");
const { shouldBehaveLikeERC1155721Inventory } = require("./behaviors/ERC1155721Inventory.behavior");

const [creator] = accounts;

describe("ERC1155721InventoryMock", function() {
    const implementation = require("./implementations/ERC1155721InventoryMock");

    beforeEach(async function() {
        this.token = await contract.fromArtifact(implementation.contractName).new({ from: creator });
    });

    shouldBehaveLikeERC1155721Inventory(implementation, accounts);
});

describe("ERC1155721InventoryFullMock", function() {
    const implementation = require("./implementations/ERC1155721InventoryFullMock");

    beforeEach(async function() {
        this.token = await contract.fromArtifact(implementation.contractName).new({ from: creator });
    });

    shouldBehaveLikeERC1155721Inventory(implementation, accounts);
});

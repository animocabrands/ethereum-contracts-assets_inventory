const ERC1155Inventory = artifacts.require('ERC1155InventoryMock');

module.exports = async (deployer, network, accounts) => {
    const [creator, minter] = accounts;

    await deployer.deploy(ERC1155Inventory);
    const inventory = await ERC1155Inventory.deployed();
    await inventory.addMinter(minter, {from: creator});
}

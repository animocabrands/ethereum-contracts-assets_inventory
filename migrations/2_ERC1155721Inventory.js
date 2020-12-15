const ERC1155721Inventory = artifacts.require('ERC1155721InventoryMock');

module.exports = async (deployer, network, accounts) => {
    const [creator, minter] = accounts;

    await deployer.deploy(ERC1155721Inventory);
    const inventory = await ERC1155721Inventory.deployed();
    await inventory.addMinter(minter, {from: creator});
}

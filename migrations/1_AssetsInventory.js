const AssetsInventoryMock = artifacts.require('AssetsInventoryMock');

module.exports = async (deployer, network, accounts) => { 
    await deployer.deploy(AssetsInventoryMock, 1);
}
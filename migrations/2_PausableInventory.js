const PausableInventoryMock = artifacts.require('PausableInventoryMock');

module.exports = async (deployer, network, accounts) => { 
    await deployer.deploy(PausableInventoryMock, 2);
}
const NonBurnableInventoryMock = artifacts.require('NonBurnableInventoryMock');

module.exports = async (deployer, network, accounts) => { 
    await deployer.deploy(NonBurnableInventoryMock, 1);
}
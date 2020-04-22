const NonBurnablePausableInventoryMock = artifacts.require('NonBurnablePausableInventoryMock');

module.exports = async (deployer, network, accounts) => { 
    await deployer.deploy(NonBurnablePausableInventoryMock, 2);
}
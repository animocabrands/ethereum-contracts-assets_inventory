
const GasToken = artifacts.require('ERC20FullMock');
const Meta20InventoryMock = artifacts.require('Meta20InventoryMock');

module.exports = async (deployer, network, accounts) => {
    const gasTokenBalance = "1000000";
    const payoutWallet = "0xc974C5f0C5b0662E00a54139C039273608b74754";

    await deployer.deploy(GasToken, gasTokenBalance);
    const gasToken = await GasToken.deployed();

    await deployer.deploy(Meta20InventoryMock, 8, gasToken.address, payoutWallet);
}
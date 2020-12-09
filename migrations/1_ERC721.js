const GasToken = artifacts.require('ERC20WithOperatorsMock');
const AssetsInventory = artifacts.require('ERC1155AssetsInventoryMock');
const BurnableInventory = artifacts.require('ERC1155BurnableInventoryMock');
const PausableInventory = artifacts.require('ERC1155PausableInventoryMock');
const MetaInventory = artifacts.require('ERC1155MetaInventoryMock');

module.exports = async (deployer, network, accounts) => {

    const nfMaskLength = 32;
    const payoutWallet = accounts[1];

    await deployer.deploy(AssetsInventory, nfMaskLength);
    await deployer.deploy(BurnableInventory, nfMaskLength);
    await deployer.deploy(PausableInventory, nfMaskLength);

    const gasToken = await deployer.deploy(GasToken, nfMaskLength);
    const metaInventory = await deployer.deploy(MetaInventory, nfMaskLength, gasToken.address, payoutWallet);
    await gasToken.whitelistOperator(metaInventory.address, true);
}
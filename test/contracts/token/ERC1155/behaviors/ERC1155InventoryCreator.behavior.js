const {accounts, web3} = require('hardhat');
const {createFixtureLoader} = require('@animoca/ethereum-contracts-core_library/test/utils/fixture');
const {
  makeFungibleCollectionId,
  makeNonFungibleCollectionId,
  makeNonFungibleTokenId,
} = require('@animoca/blockchain-inventory_metadata').inventoryIds;
const {ZeroAddress} = require('@animoca/ethereum-contracts-core_library').constants;
const expectRevert = require('@openzeppelin/test-helpers/src/expectRevert');

function shouldBehaveLikeERC1155InventoryCreator({nfMaskLength, contractName, revertMessages, methods, deploy, mint}) {
  const [deployer] = accounts;

  const {'creator(uint256)': creator_ERC1155Inventory} = methods;

  const nonFungibleToken = makeNonFungibleTokenId(999, 999, nfMaskLength);

  const createdFungibleToken = makeFungibleCollectionId(1);
  const createdNonFungibleCollection = makeNonFungibleCollectionId(1, nfMaskLength);

  const otherFungibleToken = makeFungibleCollectionId(2);
  const otherNonFungibleCollection = makeNonFungibleCollectionId(2, nfMaskLength);

  describe('like an ERC1155InventoryCreator', function () {
    if (creator_ERC1155Inventory === undefined) {
      console.log(
        `ERC1155InventoryCreator: non-standard ERC1155 method creator(uint256)` +
          `is not supported by ${contractName}, associated tests will be skipped`
      );
    }

    const fixtureLoader = createFixtureLoader(accounts, web3.eth.currentProvider);
    const fixture = async function () {
      this.token = await deploy(deployer);
      await this.token.createCollection(createdFungibleToken, {from: deployer});
      await this.token.createCollection(createdNonFungibleCollection, {from: deployer});
    };

    beforeEach(async function () {
      await fixtureLoader(fixture, this);
    });

    describe('creator(uint256)', function () {
      if (creator_ERC1155Inventory === undefined) {
        return;
      }
      it('reverts for a Non-Fungible Token', async function () {
        await expectRevert(creator_ERC1155Inventory(this.token, nonFungibleToken), revertMessages.NotCollection);
      });
      it('reverts for a minted Non-Fungible Token', async function () {
        await mint(this.token, deployer, nonFungibleToken, 1, {from: deployer});
        await expectRevert(creator_ERC1155Inventory(this.token, nonFungibleToken), revertMessages.NotCollection);
      });
      it('returns the creator for a created Fungible Token', async function () {
        (await creator_ERC1155Inventory(this.token, createdFungibleToken)).should.be.equal(deployer);
      });
      it('returns the creator for a created Non-Fungible Collection', async function () {
        (await creator_ERC1155Inventory(this.token, createdNonFungibleCollection)).should.be.equal(deployer);
      });
      it('returns the zero address for a non-created Fungible Token', async function () {
        (await creator_ERC1155Inventory(this.token, otherFungibleToken)).should.be.equal(ZeroAddress);
      });
      it('returns the zero address for a non-created Non-Fungible Collection', async function () {
        (await creator_ERC1155Inventory(this.token, otherNonFungibleCollection)).should.be.equal(ZeroAddress);
      });
    });
  });
}

module.exports = {
  shouldBehaveLikeERC1155InventoryCreator,
};

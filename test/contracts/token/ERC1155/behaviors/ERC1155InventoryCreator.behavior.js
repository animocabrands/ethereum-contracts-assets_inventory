const {accounts, web3} = require('hardhat');
const {createFixtureLoader} = require('@animoca/ethereum-contracts-core_library/test/utils/fixture');
const {
  makeFungibleCollectionId,
  makeNonFungibleCollectionId,
  makeNonFungibleTokenId,
} = require('@animoca/blockchain-inventory_metadata').inventoryIds;
const {ZeroAddress} = require('@animoca/ethereum-contracts-core_library').constants;
const {expectEvent, expectRevert} = require('@openzeppelin/test-helpers');

function shouldBehaveLikeERC1155InventoryCreator({nfMaskLength, contractName, revertMessages, methods, deploy, mint}) {
  const [deployer] = accounts;

  const {'createCollection(uint256)': createCollection_ERC1155Inventory} = methods;

  const nonFungibleToken = makeNonFungibleTokenId(999, 999, nfMaskLength);

  const createdFungibleToken = makeFungibleCollectionId(1);
  const createdNonFungibleCollection = makeNonFungibleCollectionId(1, nfMaskLength);

  const otherFungibleToken = makeFungibleCollectionId(2);
  const otherNonFungibleCollection = makeNonFungibleCollectionId(2, nfMaskLength);

  describe('like an ERC1155InventoryCreator', function () {
    if (createCollection_ERC1155Inventory === undefined) {
      console.log(
        `ERC1155InventoryCreator: non-standard ERC1155 method createCollection(uint256)` +
          `is not supported by ${contractName}, associated tests will be skipped`
      );
      return;
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

    describe('createCollection(uint256)', function () {
      it('reverts with a non-collection identifier', async function () {
        await expectRevert(createCollection_ERC1155Inventory(this.token, nonFungibleToken, {from: deployer}), revertMessages.NotCollection);
      });

      it('reverts with a fungible collection already created', async function () {
        await expectRevert(createCollection_ERC1155Inventory(this.token, createdFungibleToken, {from: deployer}), revertMessages.ExistingCollection);
      });

      it('reverts with a non-fungible collection already created', async function () {
        await expectRevert(
          createCollection_ERC1155Inventory(this.token, createdNonFungibleCollection, {from: deployer}),
          revertMessages.ExistingCollection
        );
      });

      context('when creating a fungible collection', function () {
        let receipt;
        beforeEach(async function () {
          receipt = await createCollection_ERC1155Inventory(this.token, otherFungibleToken, {from: deployer});
        });

        it('sets the creator', async function () {
          (await this.token.creator(otherFungibleToken)).should.be.equal(deployer);
        });

        it('emits a CollectionCreated event', async function () {
          expectEvent(receipt, 'CollectionCreated', {
            collectionId: otherFungibleToken,
            fungible: true,
          });
        });
      });

      context('when creating a non-fungible collection', function () {
        let receipt;
        beforeEach(async function () {
          receipt = await createCollection_ERC1155Inventory(this.token, otherNonFungibleCollection, {from: deployer});
        });

        it('sets the creator', async function () {
          (await this.token.creator(otherNonFungibleCollection)).should.be.equal(deployer);
        });

        it('emits a CollectionCreated event', async function () {
          expectEvent(receipt, 'CollectionCreated', {
            collectionId: otherNonFungibleCollection,
            fungible: false,
          });
        });
      });
    });

    describe('creator(uint256)', function () {
      it('reverts for a Non-Fungible Token', async function () {
        await expectRevert(this.token.creator(nonFungibleToken), revertMessages.NotCollection);
      });
      it('reverts for a minted Non-Fungible Token', async function () {
        await mint(this.token, deployer, nonFungibleToken, 1, {from: deployer});
        await expectRevert(this.token.creator(nonFungibleToken), revertMessages.NotCollection);
      });
      it('returns the creator for a created Fungible Token', async function () {
        (await this.token.creator(createdFungibleToken)).should.be.equal(deployer);
      });
      it('returns the creator for a created Non-Fungible Collection', async function () {
        (await this.token.creator(createdNonFungibleCollection)).should.be.equal(deployer);
      });
      it('returns the zero address for a non-created Fungible Token', async function () {
        (await this.token.creator(otherFungibleToken)).should.be.equal(ZeroAddress);
      });
      it('returns the zero address for a non-created Non-Fungible Collection', async function () {
        (await this.token.creator(otherNonFungibleCollection)).should.be.equal(ZeroAddress);
      });
    });
  });
}

module.exports = {
  shouldBehaveLikeERC1155InventoryCreator,
};

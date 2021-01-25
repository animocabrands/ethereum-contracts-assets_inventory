const {accounts, web3} = require('hardhat');
const {createFixtureLoader} = require('@animoca/ethereum-contracts-core_library/test/utils/fixture');
const {BN, expectEvent, expectRevert} = require('@openzeppelin/test-helpers');
const {
  makeFungibleCollectionId,
  makeNonFungibleCollectionId,
  makeNonFungibleTokenId,
} = require('@animoca/blockchain-inventory_metadata').inventoryIds;
const {ZeroAddress} = require('@animoca/ethereum-contracts-core_library').constants;

function shouldBehaveLikeERC1155721InventoryBurnable({nfMaskLength, contractName, revertMessages, methods, deploy, mint}) {
  const [deployer, owner, operator, other] = accounts;

  const {
    'burnFrom(address,uint256,uint256)': burnFrom_ERC1155,
    'batchBurnFrom(address,uint256[],uint256[])': batchBurnFrom_ERC1155,
    'batchBurnFrom(address,uint256[])': batchBurnFrom_ERC721,
  } = methods;

  if (burnFrom_ERC1155 === undefined) {
    console.log(
      `ERC1155721InventoryBurnable: non-standard ERC1155 method burnFrom(address,uint256,uint256)` +
        ` is not supported by ${contractName}, associated tests will be skipped`
    );
  }
  if (batchBurnFrom_ERC1155 === undefined) {
    console.log(
      `ERC1155721InventoryBurnable: non-standard ERC1155 method batchBurnFrom(address,uint256[],uint256[])` +
        ` is not supported by ${contractName}, associated tests will be skipped`
    );
  }
  if (batchBurnFrom_ERC721 === undefined) {
    console.log(
      `ERC1155721InventoryBurnable: non-standard ERC721 method batchBurnFrom(address,uint256[])` +
        ` is not supported by ${contractName}, associated tests will be skipped`
    );
  }

  describe('like a burnable ERC1155721Inventory', function () {
    const fCollection = {
      id: makeFungibleCollectionId(1),
      supply: 10,
    };
    const nfCollection = makeNonFungibleCollectionId(1, nfMaskLength);
    const nft = makeNonFungibleTokenId(1, 1, nfMaskLength);

    const fixtureLoader = createFixtureLoader(accounts, web3.eth.currentProvider);
    const fixture = async function () {
      this.token = await deploy(deployer);
      await this.token.createCollection(fCollection.id, {from: deployer});
      await this.token.createCollection(nfCollection, {from: deployer});
      await mint(this.token, owner, fCollection.id, fCollection.supply, {from: deployer});
      await mint(this.token, owner, nft, 1, {from: deployer});
    };

    beforeEach(async function () {
      await fixtureLoader(fixture, this);
    });

    describe('burnFrom(address,uint256,uint256)', function () {
      if (burnFrom_ERC1155 === undefined) {
        return;
      }

      context('with a non-fungible token', function () {
        const burnNft = function (from, sender, nft) {
          let ownerOf,
            balanceBefore,
            nftBalanceBefore,
            supplyBefore,
            nftSupplyBefore,
            receipt,
            balanceAfter,
            nftBalanceAfter,
            supplyAfter,
            nftSupplyAfter;

          beforeEach(async function () {
            ownerOf = await this.token.ownerOf(nft);
            balanceBefore = await this.token.balanceOf(from, nfCollection);
            nftBalanceBefore = await this.token.balanceOf(owner);
            supplyBefore = await this.token.totalSupply(nfCollection);
            nftSupplyBefore = await this.token.totalSupply(nft);
            receipt = await burnFrom_ERC1155(this.token, from, nft, '1', {from: sender});
            balanceAfter = await this.token.balanceOf(owner, nfCollection);
            nftBalanceAfter = await this.token.balanceOf(owner);
            supplyAfter = await this.token.totalSupply(nfCollection);
            nftSupplyAfter = await this.token.totalSupply(nft);
          });

          it('updates the collection balance', function () {
            balanceAfter.should.be.bignumber.equal(balanceBefore.subn(1));
          });

          it('updates the nft balance', function () {
            nftBalanceAfter.should.be.bignumber.equal(nftBalanceBefore.subn(1));
          });

          it('updates the collection supply', function () {
            supplyAfter.should.be.bignumber.equal(supplyBefore.subn(1));
          });

          it('updates the nft supply', function () {
            nftSupplyAfter.should.be.bignumber.equal(nftSupplyBefore.subn(1));
          });

          it('emits a TransferSingle', function () {
            expectEvent(receipt, 'TransferSingle', {
              _operator: sender,
              _from: from,
              _to: ZeroAddress,
              _id: nft,
              _value: '1',
            });
          });

          it('burns the token', async function () {
            ownerOf.should.equal(owner);
            await expectRevert(this.token.ownerOf(nft), revertMessages.NonExistingNFT);
          });
        };

        context('from is not the owner', function () {
          it('reverts', async function () {
            await expectRevert(burnFrom_ERC1155(this.token, other, nft, 1, {from: other}), revertMessages.NonOwnedNFT);
          });
        });

        context('sent by the owner', function () {
          burnNft.bind(this, owner, owner, nft)();
        });

        context('sent by an approved operator', function () {
          beforeEach(async function () {
            await this.token.setApprovalForAll(operator, true, {from: owner});
          });

          burnNft.bind(this, owner, operator, nft)();
        });

        context('sent by a non-approved account', function () {
          it('reverts', async function () {
            await expectRevert(burnFrom_ERC1155(this.token, owner, nft, 1, {from: other}), revertMessages.NonApproved);
          });
        });
      });

      context('with fungible tokens', function () {
        const burnFungible = function (from, sender, collection, amount) {
          let balanceBefore, supplyBefore, receipt, balanceAfter, supplyAfter;

          beforeEach(async function () {
            balanceBefore = await this.token.balanceOf(from, collection);
            supplyBefore = await this.token.totalSupply(collection);
            receipt = await burnFrom_ERC1155(this.token, from, collection, amount, {from: sender});
            balanceAfter = await this.token.balanceOf(owner, collection);
            supplyAfter = await this.token.totalSupply(collection);
          });

          it('updates the collection balance', function () {
            balanceAfter.should.be.bignumber.equal(balanceBefore.subn(amount));
          });

          it('updates the collection supply', function () {
            supplyAfter.should.be.bignumber.equal(supplyBefore.subn(amount));
          });

          it('emits a TransferSingle event', function () {
            expectEvent(receipt, 'TransferSingle', {
              _operator: sender,
              _from: from,
              _to: ZeroAddress,
              _id: collection,
              _value: new BN(amount),
            });
          });
        };

        context('sent a correct amount', function () {
          burnFungible.bind(this, owner, owner, fCollection.id, 2)();
        });

        context('sent by an approved operator', function () {
          beforeEach(async function () {
            await this.token.setApprovalForAll(operator, true, {from: owner});
          });

          burnFungible.bind(this, owner, operator, fCollection.id, 3)();
        });

        context('sent by a non-approved account', function () {
          it('reverts', async function () {
            await expectRevert(burnFrom_ERC1155(this.token, owner, fCollection.id, 4, {from: other}), revertMessages.NonApproved);
          });
        });

        context('sent more than owned', function () {
          it('reverts', async function () {
            await expectRevert(burnFrom_ERC1155(this.token, owner, fCollection.id, 11, {from: owner}), revertMessages.InsufficientBalance);
          });
        });
      });
    });

    describe('batchBurnFrom(address,uint256[],uint256[])', function () {
      if (batchBurnFrom_ERC1155 === undefined) {
        return;
      }
      // TODO
    });
  });
}

module.exports = {
  shouldBehaveLikeERC1155721InventoryBurnable,
};

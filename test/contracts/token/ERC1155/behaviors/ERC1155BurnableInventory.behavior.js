const {accounts, web3} = require('hardhat');
const {createFixtureLoader} = require('@animoca/ethereum-contracts-core_library/test/utils/fixture');
const {BN, expectEvent, expectRevert} = require('@openzeppelin/test-helpers');
const {
  makeFungibleCollectionId,
  makeNonFungibleCollectionId,
  makeNonFungibleTokenId,
} = require('@animoca/blockchain-inventory_metadata').inventoryIds;
const {ZeroAddress, EmptyByte} = require('@animoca/ethereum-contracts-core_library').constants;

function shouldBehaveLikeERC1155BurnableInventory({
  nfMaskLength,
  contractName,
  revertMessages,
  deploy,
  safeMint,
  burnFrom_ERC1155,
  batchBurnFrom_ERC1155,
}) {
  const [deployer, _minter, owner, operator, _approved, other] = accounts;

  if (burnFrom_ERC1155 === undefined) {
    console.log(
      `ERC1155BurnableInventory: non-standard ERC1155 method burnFrom(address,uint256,uint256)` +
        `is not supported by ${contractName}, associated tests will be skipped`
    );
  }
  if (batchBurnFrom_ERC1155 === undefined) {
    console.log(
      `ERC1155BurnableInventory: non-standard ERC1155 method batchBurnFrom(address,uint256[],uint256[])` +
        `is not supported by ${contractName}, associated tests will be skipped`
    );
  }

  describe('like a burnable ERC1155Inventory', function () {
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
      await safeMint(this.token, owner, fCollection.id, fCollection.supply, '0x', {from: deployer});
      await safeMint(this.token, owner, nft, 1, '0x', {from: deployer});
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
            nftBalanceBefore = await this.token.balanceOf(owner, nft);
            supplyBefore = await this.token.totalSupply(nfCollection);
            nftSupplyBefore = await this.token.totalSupply(nft);
            receipt = await burnFrom_ERC1155(this.token, from, nft, '1', {from: sender});
            balanceAfter = await this.token.balanceOf(owner, nfCollection);
            nftBalanceAfter = await this.token.balanceOf(owner, nft);
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

          // TODO move to ERC1155721
          // const nftBalanceBefore = await contract.balanceOf(owner);
          // const existsBefore = await contract.exists(nft);
          // existsBefore.should.be.true;

          // TODO move to ERC1155721
          // const nftBalanceAfter = await contract.balanceOf(owner);
          // nftBalanceAfter.should.be.bignumber.equal(nftBalanceBefore.subn(1));
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
            await expectRevert(this.token.burnFrom(owner, nft, 1, {from: other}), revertMessages.NonApproved);
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
          beforeEach(async function () {
            await this.token.setApprovalForAll(operator, true, {from: owner});
          });

          it('reverts', async function () {
            await expectRevert(burnFrom_ERC1155(this.token, owner, fCollection.id, 11, {from: operator}), revertMessages.InsufficientBalance);
          });
        });
      });
    });

    describe('batchBurnFrom(address,uint256[],uint256[])', function () {
      if (batchBurnFrom_ERC1155 === undefined) {
        return;
      }

      it('reverts if `ids` and `values` have different lengths', async function () {
        await expectRevert(batchBurnFrom_ERC1155(this.token, owner, [nft, fCollection.id], [1], {from: owner}), revertMessages.InconsistentArrays);
      });

      it('reverts if the token is a non-fungible collection ID', async function () {
        await expectRevert(batchBurnFrom_ERC1155(this.token, owner, [nfCollection], [1], {from: owner}), revertMessages.NotTokenId);
      });

      context('with non-fungible tokens', function () {
        it('reverts if the sender is not approved', async function () {
          await expectRevert(batchBurnFrom_ERC1155(this.token, owner, [nft], [1], {from: operator}), revertMessages.NonApproved_Batch);
        });

        it('reverts if the token has already been burned', async function () {
          await batchBurnFrom_ERC1155(this.token, owner, [nft], [1], {from: owner});
          await expectRevert(batchBurnFrom_ERC1155(this.token, owner, [nft], [1], {from: owner}), revertMessages.NonOwnedNFT);
        });

        it('reverts if the token is not owned by `from`', async function () {
          await expectRevert(batchBurnFrom_ERC1155(this.token, operator, [nft], [1], {from: operator}), revertMessages.NonOwnedNFT);
        });

        it('reverts if `value` is greater than 1', async function () {
          await expectRevert(batchBurnFrom_ERC1155(this.token, owner, [nft], [2], {from: owner}), revertMessages.WrongNFTValue);
        });

        it('reverts if `value` is less than 1', async function () {
          await expectRevert(batchBurnFrom_ERC1155(this.token, owner, [nft], [0], {from: owner}), revertMessages.WrongNFTValue);
        });

        context('when successful', function () {
          const batchBurnNftFrom = async function (from, ids, values, sender) {
            beforeEach(async function () {
              this.nftBalance = await this.token.balanceOf(from, nft);
              this.balance = await this.token.balanceOf(from, nfCollection);
              this.nftSupply = await this.token.totalSupply(nft);
              this.supply = await this.token.totalSupply(nfCollection);
              this.receipt = await batchBurnFrom_ERC1155(this.token, from, ids, values, {from: sender});
            });

            it('should decrease the token balance of the owner', async function () {
              (await this.token.balanceOf(from, nft)).should.be.bignumber.equal(this.nftBalance.subn(1));
            });

            it('should decrease the token collection balance of the owner', async function () {
              (await this.token.balanceOf(from, nfCollection)).should.be.bignumber.equal(this.balance.subn(1));
            });

            it('should decrease the token supply', async function () {
              (await this.token.totalSupply(nft)).should.be.bignumber.equal(this.nftSupply.subn(1));
            });

            it('should decrease the token collection supply', async function () {
              (await this.token.totalSupply(nfCollection)).should.be.bignumber.equal(this.supply.subn(1));
            });

            it('emits the TransferBatch event', async function () {
              expectEvent(this.receipt, 'TransferBatch', {
                _operator: sender,
                _from: from,
                _to: ZeroAddress,
                _ids: ids,
                _values: values,
              });
            });
          };

          context('sent from the owner', function () {
            batchBurnNftFrom.bind(this)(owner, [nft], [1], owner);
          });

          context('sent from an approved operator', function () {
            beforeEach(async function () {
              await this.token.setApprovalForAll(operator, true, {from: owner});
            });

            batchBurnNftFrom.bind(this)(owner, [nft], [1], operator);
          });
        });
      });

      context('with fungible tokens', function () {
        it('reverts if the sender is not approved', async function () {
          await expectRevert(batchBurnFrom_ERC1155(this.token, owner, [fCollection.id], [1], {from: operator}), revertMessages.NonApproved_Batch);
        });

        it('reverts if the token is not owned by `from`', async function () {
          await expectRevert(
            batchBurnFrom_ERC1155(this.token, operator, [fCollection.id], [1], {from: operator}),
            revertMessages.InsufficientBalance
          );
        });

        it('reverts if `value` is 0', async function () {
          await expectRevert(batchBurnFrom_ERC1155(this.token, owner, [fCollection.id], [0], {from: owner}), revertMessages.ZeroValue);
        });

        it('reverts if burning more than the balance of `from`', async function () {
          await expectRevert(
            batchBurnFrom_ERC1155(this.token, owner, [fCollection.id], [fCollection.supply + 1], {
              from: owner,
            }),
            revertMessages.InsufficientBalance
          );
        });

        context('when successful', function () {
          const batchBurnFungibleFrom = async function (from, ids, values, sender) {
            beforeEach(async function () {
              this.balance = await this.token.balanceOf(from, fCollection.id);
              this.supply = await this.token.totalSupply(fCollection.id);
              this.receipt = await batchBurnFrom_ERC1155(this.token, from, ids, values, {from: sender});
            });

            it('should decrease the token collection balance of the owner', async function () {
              (await this.token.balanceOf(from, fCollection.id)).should.be.bignumber.equal(this.balance.subn(values[0]));
            });

            it('should decrease the token collection supply', async function () {
              (await this.token.totalSupply(fCollection.id)).should.be.bignumber.equal(this.supply.subn(values[0]));
            });

            it('emits the TransferBatch event', async function () {
              expectEvent(this.receipt, 'TransferBatch', {
                _operator: sender,
                _from: from,
                _to: ZeroAddress,
                _ids: ids,
                _values: values,
              });
            });
          };

          context('sent from the owner', function () {
            batchBurnFungibleFrom.bind(this)(owner, [fCollection.id], [3], owner);
          });

          context('sent from an approved operator', function () {
            beforeEach(async function () {
              await this.token.setApprovalForAll(operator, true, {from: owner});
            });

            batchBurnFungibleFrom.bind(this)(owner, [fCollection.id], [3], operator);
          });
        });
      });
    });
  });
}

module.exports = {
  shouldBehaveLikeERC1155BurnableInventory,
};

const {accounts, web3} = require('hardhat');
const {createFixtureLoader} = require('@animoca/ethereum-contracts-core_library/test/utils/fixture');
const {BN, expectEvent, expectRevert} = require('@openzeppelin/test-helpers');
const {
  makeFungibleCollectionId,
  makeNonFungibleCollectionId,
  makeNonFungibleTokenId,
} = require('@animoca/blockchain-inventory_metadata').inventoryIds;
const {ZeroAddress} = require('@animoca/ethereum-contracts-core_library').constants;

function shouldBehaveLikeERC1155InventoryBurnable({nfMaskLength, contractName, revertMessages, methods, deploy, mint}) {
  const [deployer, _minter, owner, operator, _approved, other] = accounts;

  const {'burnFrom(address,uint256,uint256)': burnFrom_ERC1155, 'batchBurnFrom(address,uint256[],uint256[])': batchBurnFrom_ERC1155} = methods;

  if (burnFrom_ERC1155 === undefined) {
    console.log(
      `ERC1155InventoryBurnable: non-standard ERC1155 method burnFrom(address,uint256,uint256)` +
        `is not supported by ${contractName}, associated tests will be skipped`
    );
  }
  if (batchBurnFrom_ERC1155 === undefined) {
    console.log(
      `ERC1155InventoryBurnable: non-standard ERC1155 method batchBurnFrom(address,uint256[],uint256[])` +
        `is not supported by ${contractName}, associated tests will be skipped`
    );
  }

  describe('like a burnable ERC1155Inventory', function () {
    const fCollection = {
      id: makeFungibleCollectionId(1),
      supply: 10,
    };
    const nfCollection = makeNonFungibleCollectionId(1, nfMaskLength);
    const nft1 = makeNonFungibleTokenId(1, 1, nfMaskLength);
    const nft2 = makeNonFungibleTokenId(2, 1, nfMaskLength);
    const otherNft = makeNonFungibleTokenId(999, 999, nfMaskLength);

    const fixtureLoader = createFixtureLoader(accounts, web3.eth.currentProvider);
    const fixture = async function () {
      this.token = await deploy(deployer);
      await this.token.setApprovalForAll(operator, true, {from: owner});
      await this.token.createCollection(fCollection.id, {from: deployer});
      await this.token.createCollection(nfCollection, {from: deployer});
      await mint(this.token, owner, fCollection.id, fCollection.supply, {from: deployer});
      await mint(this.token, owner, nft1, 1, {from: deployer});
      await mint(this.token, owner, nft2, 1, {from: deployer});
      await mint(this.token, owner, otherNft, 1, {from: deployer});
    };

    beforeEach(async function () {
      await fixtureLoader(fixture, this);
    });

    describe('burnFrom(address,uint256,uint256)', function () {
      if (burnFrom_ERC1155 === undefined) {
        return;
      }

      it('reverts with a Non-Fungible Collection id', async function () {
        await expectRevert(this.token.burnFrom(owner, nfCollection, 1, {from: owner}), revertMessages.NotTokenId);
      });

      context('with a Non-Fungible Token', function () {
        it('reverts if sent by a non-approved account', async function () {
          await expectRevert(this.token.burnFrom(owner, nft1, 1, {from: other}), revertMessages.NonApproved);
        });

        it('reverts if from does not own the token', async function () {
          await expectRevert(burnFrom_ERC1155(this.token, other, nft1, 1, {from: other}), revertMessages.NonOwnedNFT);
        });

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

        context('sent by the owner', function () {
          burnNft.bind(this, owner, owner, nft1)();
        });

        context('sent by an approved operator', function () {
          beforeEach(async function () {
            await this.token.setApprovalForAll(operator, true, {from: owner});
          });

          burnNft.bind(this, owner, operator, nft1)();
        });
      });

      context('with Fungible Tokens', function () {
        it('reverts if sent by a non-approved account', async function () {
          await expectRevert(burnFrom_ERC1155(this.token, owner, fCollection.id, 4, {from: other}), revertMessages.NonApproved);
        });

        it('reverts with an insufficient balance', async function () {
          await expectRevert(burnFrom_ERC1155(this.token, owner, fCollection.id, 11, {from: owner}), revertMessages.InsufficientBalance);
        });

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
          burnFungible.bind(this, owner, operator, fCollection.id, 3)();
        });
      });
    });

    describe('batchBurnFrom(address,uint256[],uint256[])', function () {
      if (batchBurnFrom_ERC1155 === undefined) {
        return;
      }

      it('reverts if arrays have different lengths', async function () {
        await expectRevert(batchBurnFrom_ERC1155(this.token, owner, [nft1, fCollection.id], [1], {from: owner}), revertMessages.InconsistentArrays);
      });

      it('reverts with a Non-Fungible Collection id', async function () {
        await expectRevert(batchBurnFrom_ERC1155(this.token, owner, [nfCollection], [1], {from: owner}), revertMessages.NotTokenId);
        await expectRevert(
          batchBurnFrom_ERC1155(this.token, owner, [fCollection.id, nfCollection], [fCollection.supply, 1], {from: owner}),
          revertMessages.NotTokenId
        );
        await expectRevert(batchBurnFrom_ERC1155(this.token, owner, [nft1, nfCollection], [1, 1], {from: owner}), revertMessages.NotTokenId);
        await expectRevert(
          batchBurnFrom_ERC1155(this.token, owner, [fCollection.id, nft1, nfCollection], [fCollection.supply, 1, 1], {from: owner}),
          revertMessages.NotTokenId
        );
      });

      it('reverts if the sender is not approved', async function () {
        await expectRevert(batchBurnFrom_ERC1155(this.token, owner, [nft1], [1], {from: other}), revertMessages.NonApproved_Batch);
      });

      it('reverts if `from` is not the owner for a Non-Fungible Token', async function () {
        await expectRevert(batchBurnFrom_ERC1155(this.token, operator, [nft1], [1], {from: operator}), revertMessages.NonOwnedNFT);
      });

      it('reverts if `value` is greater than 1 for a Non-Fungible Token', async function () {
        await expectRevert(batchBurnFrom_ERC1155(this.token, owner, [nft1], [2], {from: owner}), revertMessages.WrongNFTValue);
      });

      it('reverts if `value` is 0 for a Non-Fungible Token', async function () {
        await expectRevert(batchBurnFrom_ERC1155(this.token, owner, [nft1], [0], {from: owner}), revertMessages.WrongNFTValue);
      });

      it('reverts with an insufficient balance for a Fungible Token', async function () {
        await expectRevert(batchBurnFrom_ERC1155(this.token, operator, [fCollection.id], [1], {from: operator}), revertMessages.InsufficientBalance);
      });

      it('reverts if `value` is 0 for a Fungible Token', async function () {
        await expectRevert(batchBurnFrom_ERC1155(this.token, owner, [fCollection.id], [0], {from: owner}), revertMessages.ZeroValue);
      });

      context('when successful', function () {
        const batchBurnNftFrom = async function (from, ids, values, sender) {
          beforeEach(async function () {
            this.receipt = await batchBurnFrom_ERC1155(this.token, from, ids, values, {from: sender});
          });

          it('should remove the Non-Fungible Tokens owner', async function () {
            await expectRevert(this.token.ownerOf(nft1), revertMessages.NonExistingNFT);
            await expectRevert(this.token.ownerOf(nft2), revertMessages.NonExistingNFT);
          });

          it('should set the Non-Fungible Token balances of the owner to 0', async function () {
            (await this.token.balanceOf(from, nft1)).should.be.bignumber.equal('0');
            (await this.token.balanceOf(from, nft2)).should.be.bignumber.equal('0');
          });

          it('should decrease the Non-Fungible Collection balances of the owner', async function () {
            (await this.token.balanceOf(from, nfCollection)).should.be.bignumber.equal('0');
          });

          it('should set the Non-Fungible Token supply to 0', async function () {
            (await this.token.totalSupply(nft1)).should.be.bignumber.equal('0');
          });

          it('should decrease Non-Fungible Collection supplies', async function () {
            (await this.token.totalSupply(nfCollection)).should.be.bignumber.equal('0');
          });

          it('should decrease the Fungible Token balances of the owner', async function () {
            (await this.token.balanceOf(from, fCollection.id)).should.be.bignumber.equal('0');
          });

          it('should decrease the Funngible Token supplies', async function () {
            (await this.token.totalSupply(fCollection.id)).should.be.bignumber.equal('0');
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

        context('sent from the owner, optimal gas-usage', function () {
          batchBurnNftFrom.bind(this)(owner, [nft1, nft2, fCollection.id, otherNft], [1, 1, fCollection.supply, 1], owner);
        });

        context('sent from the owner, non-optimal gas-usage', function () {
          batchBurnNftFrom.bind(this)(owner, [nft1, fCollection.id, otherNft, nft2], [1, fCollection.supply, 1, 1], owner);
        });

        context('sent from an approved operator', function () {
          batchBurnNftFrom.bind(this)(owner, [nft1, nft2, fCollection.id, otherNft], [1, 1, fCollection.supply, 1], operator);
        });

        context('with an empty list of tokens', function () {
          const from = owner;
          beforeEach(async function () {
            this.receipt = await batchBurnFrom_ERC1155(this.token, from, [], [], {from});
          });
          it('emits the TransferBatch event', async function () {
            expectEvent(this.receipt, 'TransferBatch', {
              _operator: from,
              _from: from,
              _to: ZeroAddress,
              _ids: [],
              _values: [],
            });
          });
        });
      });
    });
  });
}

module.exports = {
  shouldBehaveLikeERC1155InventoryBurnable,
};

const {artifacts, accounts, web3} = require('hardhat');
const {createFixtureLoader} = require('@animoca/ethereum-contracts-core_library/test/utils/fixture');
const {expectEventWithParamsOverride} = require('@animoca/ethereum-contracts-core_library/test/utils/events');
const {BN, expectRevert} = require('@openzeppelin/test-helpers');
const {One, ZeroAddress} = require('@animoca/ethereum-contracts-core_library').constants;

const {
  makeNonFungibleTokenId,
  makeNonFungibleCollectionId,
  makeFungibleCollectionId,
} = require('@animoca/blockchain-inventory_metadata').inventoryIds;

function shouldBehaveLikeERC721Burnable({nfMaskLength, contractName, revertMessages, eventParamsOverrides, interfaces, methods, deploy, mint}) {
  const [deployer, minter, owner, other, approved, operator] = accounts;

  const {'burnFrom(address,uint256)': burnFrom_ERC721, 'batchBurnFrom(address,uint256[])': batchBurnFrom_ERC721} = methods;

  if (burnFrom_ERC721 === undefined) {
    console.log(
      `ERC721Burnable: non-standard ERC721 method burnFrom(address,uint256)` +
        ` is not supported by ${contractName}, associated tests will be skipped`
    );
  }
  if (batchBurnFrom_ERC721 === undefined) {
    console.log(
      `ERC721Burnable: non-standard ERC721 method batchBurnFrom(address,uint256[])` +
        `is not supported by ${contractName}, associated tests will be skipped`
    );
  }

  const fungibleToken = makeFungibleCollectionId(1);
  const nfCollection = makeNonFungibleCollectionId(1, nfMaskLength);
  const otherNFCollection = makeNonFungibleCollectionId(2, nfMaskLength);
  const nft1 = makeNonFungibleTokenId(1, 1, nfMaskLength);
  const nft2 = makeNonFungibleTokenId(2, 1, nfMaskLength);
  const nftOtherCollection = makeNonFungibleTokenId(1, 2, nfMaskLength);
  const unknownNFT = makeNonFungibleTokenId(999, 1, nfMaskLength);

  describe('like a burnable ERC721', function () {
    const fixtureLoader = createFixtureLoader(accounts, web3.eth.currentProvider);
    const fixture = async function () {
      this.token = await deploy(deployer);
      await this.token.addMinter(minter, {from: deployer});
      await mint(this.token, owner, fungibleToken, 1, {from: minter});
      await mint(this.token, owner, nft1, 1, {from: minter});
      await mint(this.token, owner, nft2, 1, {from: minter});
      await mint(this.token, owner, nftOtherCollection, 1, {from: minter});
      await this.token.approve(approved, nft1, {from: owner});
      await this.token.approve(approved, nft2, {from: owner});
      await this.token.approve(approved, nftOtherCollection, {from: owner});
      await this.token.setApprovalForAll(operator, true, {from: owner});

      // pre-transfer state
      this.nftBalance = await this.token.balanceOf(owner);
      if (interfaces.ERC1155Inventory) {
        this.nfcSupply = await this.token.totalSupply(nfCollection);
        this.otherNFCSupply = await this.token.totalSupply(otherNFCollection);
        this.nfcBalance = await this.token.balanceOf(owner, nfCollection);
        this.otherNFCBalance = await this.token.balanceOf(owner, otherNFCollection);
      }
    };

    beforeEach(async function () {
      await fixtureLoader(fixture, this);
    });

    let receipt = null;

    const burnWasSuccessful = function (ids, options) {
      it('transfers the ownership of the token(s)', async function () {
        const nftIds = Array.isArray(ids) ? ids : [ids];
        for (const id of nftIds) {
          await expectRevert(this.token.ownerOf(id), revertMessages.NonExistingNFT);
        }
      });

      it('clears the approval for the token(s)', async function () {
        const nftIds = Array.isArray(ids) ? ids : [ids];
        for (const id of nftIds) {
          await expectRevert(this.token.getApproved(id), revertMessages.NonExistingNFT);
        }
      });

      it('emits Transfer event(s)', function () {
        const nftIds = Array.isArray(ids) ? ids : [ids];
        for (const id of nftIds) {
          expectEventWithParamsOverride(
            receipt,
            'Transfer',
            {
              _from: owner,
              _to: ZeroAddress,
              _tokenId: id,
            },
            eventParamsOverrides
          );
        }
      });

      if (interfaces.ERC1155) {
        if (Array.isArray(ids)) {
          it('[ERC1155] emits a TransferBatch event', function () {
            expectEventWithParamsOverride(
              receipt,
              'TransferBatch',
              {
                _operator: options.from,
                _from: owner,
                _to: ZeroAddress,
                _ids: ids,
                _values: ids.map(() => 1),
              },
              eventParamsOverrides
            );
          });
        } else {
          it('[ERC1155] emits a TransferSingle event', function () {
            expectEventWithParamsOverride(
              receipt,
              'TransferSingle',
              {
                _operator: options.from,
                _from: owner,
                _to: ZeroAddress,
                _id: ids,
                _value: 1,
              },
              eventParamsOverrides
            );
          });
        }
      }

      it('adjusts sender balance', async function () {
        const quantity = new BN(Array.isArray(ids) ? `${ids.length}` : '1');
        const balance = this.toWhom == owner ? this.nftBalance : this.nftBalance.sub(quantity);
        (await this.token.balanceOf(owner)).should.be.bignumber.equal(balance);
      });

      if (interfaces.ERC1155Inventory) {
        it('[ERC1155Inventory] adjusts sender Non-Fungible Collection balances', async function () {
          const nftsArray = Array.isArray(ids) ? ids : [ids];
          const nbCollectionNFTs = nftsArray.filter((id) => id != nftOtherCollection).length;
          const nbOtherCollectionNFTs = nftsArray.length - nbCollectionNFTs;
          const collectionBalance = this.toWhom == owner ? this.nfcBalance : this.nfcBalance.subn(nbCollectionNFTs);
          const otherCollectionBalance = this.toWhom == owner ? this.otherNFCBalance : this.otherNFCBalance.subn(nbOtherCollectionNFTs);
          (await this.token.balanceOf(owner, nfCollection)).should.be.bignumber.equal(collectionBalance);
          (await this.token.balanceOf(owner, otherNFCollection)).should.be.bignumber.equal(otherCollectionBalance);
        });

        it('[ERC1155Inventory] decreases the Non-Fungible Collections total supply', async function () {
          const nftsArray = Array.isArray(ids) ? ids : [ids];
          const nbCollectionNFTs = nftsArray.filter((id) => id != nftOtherCollection).length;
          const nbOtherCollectionNFTs = nftsArray.length - nbCollectionNFTs;
          (await this.token.totalSupply(nfCollection)).should.be.bignumber.equal(this.nfcSupply.subn(nbCollectionNFTs));
          (await this.token.totalSupply(otherNFCollection)).should.be.bignumber.equal(this.otherNFCSupply.subn(nbOtherCollectionNFTs));
        });
      }
    };

    const shouldBurnTokenBySender = function (burnFunction, ids) {
      context('when called by the owner', function () {
        const options = {from: owner};
        beforeEach(async function () {
          receipt = await burnFunction.call(this, owner, ids, options);
        });
        burnWasSuccessful(ids, options);
      });

      context('when called by a wallet with single token approval', function () {
        const options = {from: approved};
        beforeEach(async function () {
          receipt = await burnFunction.call(this, owner, ids, options);
        });
        burnWasSuccessful(ids, options);
      });

      context('when called by an operator', function () {
        const options = {from: operator};
        beforeEach(async function () {
          receipt = await burnFunction.call(this, owner, ids, options);
        });
        burnWasSuccessful(ids, options);
      });

      if (interfaces.Pausable) {
        context('[Pausable] when called after unpausing', function () {
          const options = {from: owner};
          beforeEach(async function () {
            await this.token.pause({from: deployer});
            await this.token.unpause({from: deployer});
            receipt = await burnFunction.call(this, owner, ids, options);
          });
          burnWasSuccessful(ids, options);
        });
      }
    };

    const shouldRevertOnPreconditions = function (burnFunction) {
      describe('Pre-conditions', function () {
        if (interfaces.Pausable) {
          it('[Pausable] reverts when paused', async function () {
            await this.token.pause({from: deployer});
            await expectRevert(burnFunction.call(this, owner, nft1, {from: owner}), revertMessages.Paused);
          });
        }
        it('reverts if the token does not exist', async function () {
          await expectRevert(burnFunction.call(this, owner, unknownNFT, {from: owner}), revertMessages.NonOwnedNFT);
        });

        it('reverts if `from` is not the token owner', async function () {
          await expectRevert(burnFunction.call(this, other, nft1, {from: other}), revertMessages.NonOwnedNFT);
        });

        it('reverts if the sender is not authorized for the token', async function () {
          await expectRevert(burnFunction.call(this, owner, nft1, {from: other}), revertMessages.NonApproved);
        });

        if (interfaces.ERC1155) {
          it('[ERC1155] reverts if the id is a Fungible Token', async function () {
            await expectRevert(burnFunction.call(this, owner, fungibleToken, {from: owner}), revertMessages.NonOwnedNFT);
          });
        }

        if (interfaces.ERC1155Inventory) {
          it('[ERC1155Inventory] reverts if the id is a Non-Fungible Collection', async function () {
            await expectRevert(burnFunction.call(this, owner, nfCollection, {from: owner}), revertMessages.NonOwnedNFT);
          });
        }
      });
    };

    describe('burnFrom(address,uint256)', function () {
      if (burnFrom_ERC721 === undefined) {
        return;
      }

      const burnFn = async function (from, tokenId, options) {
        return burnFrom_ERC721(this.token, from, tokenId, options);
      };
      shouldRevertOnPreconditions(burnFn);
      shouldBurnTokenBySender(burnFn, nft1);
    });

    describe('batchBurnFrom(address,uint256[])', function () {
      if (batchBurnFrom_ERC721 === undefined) {
        return;
      }

      const burnFn = async function (from, tokenIds, options) {
        const ids = Array.isArray(tokenIds) ? tokenIds : [tokenIds];
        return batchBurnFrom_ERC721(this.token, from, ids, options);
      };
      shouldRevertOnPreconditions(burnFn);
      context('with an empty list of tokens', function () {
        shouldBurnTokenBySender(burnFn, []);
      });
      context('with a single token', function () {
        shouldBurnTokenBySender(burnFn, [nft1]);
      });
      context('with a list of tokens from the same collection', function () {
        shouldBurnTokenBySender(burnFn, [nft1, nft2]);
      });
      if (interfaces.ERC1155Inventory) {
        context('[ERC1155Inventory] with a list of tokens sorted by collection', function () {
          shouldBurnTokenBySender(burnFn, [nft1, nft2, nftOtherCollection]);
        });
        context('[ERC1155Inventory] with an unsorted list of tokens from different collections', function () {
          shouldBurnTokenBySender(burnFn, [nft1, nftOtherCollection, nft2]);
        });
      }
    });
  });
}

module.exports = {
  shouldBehaveLikeERC721Burnable,
};

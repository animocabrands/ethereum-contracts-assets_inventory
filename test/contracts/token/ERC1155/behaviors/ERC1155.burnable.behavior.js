const {accounts, web3} = require('hardhat');
const {createFixtureLoader} = require('@animoca/ethereum-contracts-core_library/test/utils/fixture');
const {expectEventWithParamsOverride} = require('@animoca/ethereum-contracts-core_library/test/utils/events');
const {BN, expectEvent, expectRevert} = require('@openzeppelin/test-helpers');
const {
  makeFungibleCollectionId,
  makeNonFungibleCollectionId,
  makeNonFungibleTokenId,
  isNonFungibleToken,
  isFungible,
} = require('@animoca/blockchain-inventory_metadata').inventoryIds;
const {Zero, One, ZeroAddress} = require('@animoca/ethereum-contracts-core_library').constants;

function shouldBehaveLikeERC1155Burnable({nfMaskLength, contractName, revertMessages, eventParamsOverrides, interfaces, methods, deploy, mint}) {
  const [deployer, minter, owner, operator, approved, other] = accounts;

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
    const fCollection1 = {
      id: makeFungibleCollectionId(1),
      supply: 10,
    };
    const fCollection2 = {
      id: makeFungibleCollectionId(2),
      supply: 11,
    };
    const fCollection3 = {
      id: makeFungibleCollectionId(3),
      supply: 12,
    };
    const unknownFCollection = {
      id: makeFungibleCollectionId(4),
      supply: 0,
    };
    const nfCollection = makeNonFungibleCollectionId(1, nfMaskLength);
    const nfCollectionOther = makeNonFungibleCollectionId(2, nfMaskLength);
    const unknownNFCollection = makeNonFungibleCollectionId(99, nfMaskLength);
    const nft1 = makeNonFungibleTokenId(1, 1, nfMaskLength);
    const nft2 = makeNonFungibleTokenId(2, 1, nfMaskLength);
    const nftOtherCollection = makeNonFungibleTokenId(1, 2, nfMaskLength);
    const unknownNft = makeNonFungibleTokenId(99, 99, nfMaskLength);

    const fixtureLoader = createFixtureLoader(accounts, web3.eth.currentProvider);
    const fixture = async function () {
      this.token = await deploy(deployer);
      await this.token.addMinter(minter, {from: deployer});
      await mint(this.token, owner, fCollection1.id, fCollection1.supply, {from: minter});
      await mint(this.token, owner, fCollection2.id, fCollection2.supply, {from: minter});
      await mint(this.token, owner, fCollection3.id, fCollection3.supply, {from: minter});
      await mint(this.token, owner, nft1, 1, {from: minter});
      await mint(this.token, owner, nft2, 1, {from: minter});
      await mint(this.token, owner, nftOtherCollection, 1, {from: minter});
      await this.token.setApprovalForAll(operator, true, {from: owner});
      if (interfaces.ERC721) {
        await this.token.approve(approved, nft1, {from: owner});
        await this.token.approve(approved, nft2, {from: owner});
        // await this.token.approve(approved, nftOtherCollection, {from: owner});
      }

      // pre-transfer state
      if (interfaces.ERC721) {
        this.nftBalance = await this.token.balanceOf(owner);
      }
      if (interfaces.ERC1155Inventory) {
        this.nfcSupply = await this.token.totalSupply(nfCollection);
        this.otherNFCSupply = await this.token.totalSupply(nfCollectionOther);
        this.nfcBalance = await this.token.balanceOf(owner, nfCollection);
        this.otherNFCBalance = await this.token.balanceOf(owner, nfCollectionOther);
      }
    };

    beforeEach(async function () {
      await fixtureLoader(fixture, this);
    });

    let receipt = null;

    const burnWasSuccessful = function (tokenIds, values, options) {
      const ids = Array.isArray(tokenIds) ? tokenIds : [tokenIds];
      const vals = Array.isArray(values) ? values : [values];
      const tokens = ids.map((id, i) => [id, vals[i]]);
      const fungibleTokens = tokens.filter(([id, _value]) => isFungible(id));
      const nonFungibleTokens = tokens.filter(([id, _value]) => isNonFungibleToken(id, nfMaskLength));

      if (tokens.length != 0) {
        it('decreases the sender balance(s)', async function () {
          for (const [id, value] of tokens) {
            let balance;
            if (isNonFungibleToken(id, nfMaskLength)) {
              balance = 0;
              (await this.token.balanceOf(owner, id)).should.be.bignumber.equal(Zero);
            } else {
              if (id == fCollection1.id) {
                balance = fCollection1.supply;
              } else if (id == fCollection2.id) {
                balance = fCollection2.supply;
              } else if (id == fCollection3.id) {
                balance = fCollection3.supply;
              }
              balance = balance - value;
            }
            (await this.token.balanceOf(owner, id)).should.be.bignumber.equal(new BN(balance));
          }
        });

        if (interfaces.ERC1155Inventory) {
          it('[ERC1155Inventory] decreases the token(s) total supply', async function () {
            for (const [id, value] of tokens) {
              let supply;
              if (isNonFungibleToken(id, nfMaskLength)) {
                supply = 0;
              } else {
                if (id == fCollection1.id) {
                  supply = fCollection1.supply;
                } else if (id == fCollection2.id) {
                  supply = fCollection2.supply;
                } else if (id == fCollection3.id) {
                  supply = fCollection3.supply;
                }
                supply = supply - value;
              }
              (await this.token.totalSupply(id)).should.be.bignumber.equal(new BN(supply));
            }
          });
        }

        if (nonFungibleTokens.length != 0) {
          if (interfaces.ERC721 || interfaces.ERC1155Inventory) {
            it('[ERC721/ERC1155inventory] removes the ownership of the Non-Fungible Token(s)', async function () {
              for (const [id, _value] of nonFungibleTokens) {
                await expectRevert(this.token.ownerOf(id), revertMessages.NonExistingNFT);
              }
            });
          }

          if (interfaces.ERC1155Inventory) {
            const nbCollectionNFTs = nonFungibleTokens.filter(([id]) => id == nft1 || id == nft2).length;
            const nbOtherCollectionNFTs = nonFungibleTokens.filter(([id]) => id == nftOtherCollection).length;

            it('[ERC1155Inventory] decreases the sender Non-Fungible Collection(s) balance(s)', async function () {
              (await this.token.balanceOf(owner, nfCollection)).should.be.bignumber.equal(this.nfcBalance.subn(nbCollectionNFTs));
              (await this.token.balanceOf(owner, nfCollectionOther)).should.be.bignumber.equal(this.otherNFCBalance.subn(nbOtherCollectionNFTs));
            });

            it('[ERC1155Inventory] decreases the Non-Fungible Collection(s) total supply', async function () {
              (await this.token.totalSupply(nfCollection)).should.be.bignumber.equal(this.nfcSupply.subn(nbCollectionNFTs));
              (await this.token.totalSupply(nfCollectionOther)).should.be.bignumber.equal(this.otherNFCSupply.subn(nbOtherCollectionNFTs));
            });

            it('[ERC1155Inventory] sets the Non-Fungible Token(s) total supply to 0', async function () {
              for (const [id, _value] of nonFungibleTokens) {
                (await this.token.totalSupply(id)).should.be.bignumber.equal('0');
              }
            });
          }

          if (interfaces.ERC721) {
            it('[ERC721] decreases the sender NFTs balance', async function () {
              (await this.token.balanceOf(owner)).should.be.bignumber.equal(this.nftBalance.subn(nonFungibleTokens.length));
            });

            it('[ERC721] emits Transfer event(s) for Non-Fungible Token(s)', function () {
              for (const [id, value] of nonFungibleTokens) {
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
          }
        }
      }

      if (Array.isArray(tokenIds)) {
        it('emits a TransferBatch event', function () {
          expectEventWithParamsOverride(
            receipt,
            'TransferBatch',
            {
              _operator: options.from,
              _from: owner,
              _to: ZeroAddress,
              _ids: tokenIds,
              _values: values,
            },
            eventParamsOverrides
          );
        });
      } else {
        it('emits a TransferSingle event', function () {
          expectEventWithParamsOverride(
            receipt,
            'TransferSingle',
            {
              _operator: options.from,
              _from: owner,
              _to: ZeroAddress,
              _id: tokenIds,
              _value: values,
            },
            eventParamsOverrides
          );
        });
      }
    };

    const shouldBurnTokenBySender = function (burnFunction, tokenIds, values) {
      context('when called by the owner', function () {
        const options = {from: owner};
        beforeEach(async function () {
          receipt = await burnFunction.call(this, owner, tokenIds, values, options);
        });
        burnWasSuccessful(tokenIds, values, options);
      });

      context('when called by an operator', function () {
        const options = {from: operator};
        beforeEach(async function () {
          receipt = await burnFunction.call(this, owner, tokenIds, values, options);
        });
        burnWasSuccessful(tokenIds, values, options);
      });

      if (interfaces.Pausable) {
        context('[Pausable] when called after unpausing', function () {
          const options = {from: owner};
          beforeEach(async function () {
            await this.token.pause({from: deployer});
            await this.token.unpause({from: deployer});
            receipt = await burnFunction.call(this, owner, tokenIds, values, options);
          });
          burnWasSuccessful(tokenIds, values, options);
        });
      }

      if (interfaces.ERC721) {
        const ids = Array.isArray(tokenIds) ? tokenIds : [tokenIds];
        const approvedTokenIds = ids.filter((id) => id == nft1 || id == nft2);
        // All tokens are approved NFTs
        if (ids.length != 0 && ids.length == approvedTokenIds.length) {
          context('[ERC721] when called by a wallet with single token approval', function () {
            const options = {from: approved};
            beforeEach(async function () {
              receipt = await burnFunction.call(this, owner, tokenIds, values, options);
            });
            burnWasSuccessful(tokenIds, values, options);
          });
        }
      }
    };

    const shouldRevertOnPreconditions = function (burnFunction) {
      describe('Pre-conditions', function () {
        if (interfaces.Pausable) {
          it('[Pausable] reverts when paused', async function () {
            await this.token.pause({from: deployer});
            await expectRevert(burnFunction.call(this, owner, nft1, 1, {from: owner}), revertMessages.Paused);
          });
        }
        it('reverts if the sender is not approved', async function () {
          await expectRevert(burnFunction.call(this, owner, nft1, 1, {from: other}), revertMessages.NonApproved);
          await expectRevert(burnFunction.call(this, owner, fCollection1.id, 1, {from: other}), revertMessages.NonApproved);
        });

        it('reverts if a Fungible Token has a value equal 0', async function () {
          await expectRevert(burnFunction.call(this, owner, fCollection1.id, 0, {from: owner}), revertMessages.ZeroValue);
        });

        it('reverts if a Non-Fungible Token has a value different from 1', async function () {
          await expectRevert(burnFunction.call(this, owner, nft1, 0, {from: owner}), revertMessages.WrongNFTValue);
          await expectRevert(burnFunction.call(this, owner, nft1, 2, {from: owner}), revertMessages.WrongNFTValue);
        });

        it('reverts with a non-existing Non-Fungible Token', async function () {
          await expectRevert(burnFunction.call(this, owner, unknownNft, 1, {from: owner}), revertMessages.NonOwnedNFT);
        });

        it('reverts if from is not the owner for a Non-Fungible Token', async function () {
          await expectRevert(burnFunction.call(this, other, nft1, 1, {from: other}), revertMessages.NonOwnedNFT);
        });

        it('reverts if from has insufficient balance for a Fungible Token', async function () {
          await expectRevert(burnFunction.call(this, other, fCollection1.id, 1, {from: other}), revertMessages.InsufficientBalance);
        });

        if (interfaces.ERC721) {
          it('[ERC721] reverts if the sender is not authorized for the token', async function () {
            await expectRevert(burnFunction.call(this, owner, nft1, 1, {from: other}), revertMessages.NonApproved);
          });
        }

        if (interfaces.ERC1155Inventory) {
          it('[ERC1155Inventory] reverts if the id is a Non-Fungible Collection', async function () {
            await expectRevert(burnFunction.call(this, owner, nfCollection, 1, {from: owner}), revertMessages.NotToken);
          });
        }
      });
    };

    const shouldBurnToken = function (burnFunction, ids, values) {
      shouldBurnTokenBySender(burnFunction, ids, values);
    };

    describe('burnFrom(address,uint256,uint256)', function () {
      if (burnFrom_ERC1155 === undefined) {
        return;
      }
      const burnFn = async function (from, id, value, options) {
        return burnFrom_ERC1155(this.token, from, id, value, options);
      };
      shouldRevertOnPreconditions(burnFn);
      context('with a Fungible Token', function () {
        context('partial balance transfer', function () {
          shouldBurnToken(burnFn, fCollection1.id, 1, '0x42');
        });
        context('full balance transfer', function () {
          shouldBurnToken(burnFn, fCollection1.id, fCollection1.supply, '0x42');
        });
      });
      context('with a Non-Fungible Token', function () {
        shouldBurnToken(burnFn, nft1, 1, '0x42');
      });
    });

    describe('batchBurnFrom(address,uint256[],uint256[])', function () {
      if (batchBurnFrom_ERC1155 === undefined) {
        return;
      }
      const burnFn = async function (from, ids, values, options) {
        const tokenIds = Array.isArray(ids) ? ids : [ids];
        const vals = Array.isArray(values) ? values : [values];
        return batchBurnFrom_ERC1155(this.token, from, tokenIds, vals, options);
      };
      shouldRevertOnPreconditions(burnFn);
      it('reverts with inconsistent arrays', async function () {
        await expectRevert(burnFn.call(this, owner, [nft1, nft2], [1], {from: owner}), revertMessages.InconsistentArrays);
      });
      context('with an empty list of tokens', function () {
        shouldBurnToken(burnFn, [], []);
      });
      context('with Fungible Tokens', function () {
        context('single partial balance transfer', function () {
          shouldBurnToken(burnFn, [fCollection1.id], [1]);
        });
        context('single full balance transfer', function () {
          shouldBurnToken(burnFn, [fCollection1.id], [fCollection1.supply]);
        });
        context('multiple tokens transfer', function () {
          shouldBurnToken(burnFn, [fCollection1.id, fCollection2.id, fCollection3.id], [fCollection1.supply, 1, fCollection3.supply]);
        });
      });
      context('with Non-Fungible Tokens', function () {
        context('single token transfer', function () {
          shouldBurnToken(burnFn, [nft1], [1]);
        });
        context('multiple tokens from the same collection transfer', function () {
          shouldBurnToken(burnFn, [nft1, nft2], [1, 1]);
        });
        context('multiple tokens sorted by collection transfer', function () {
          shouldBurnToken(burnFn, [nft1, nft2, nftOtherCollection], [1, 1, 1]);
        });
        if (interfaces.ERC1155Inventory) {
          context('[ERC1155Inventory] multiple tokens not sorted by collection transfer', function () {
            shouldBurnToken(burnFn, [nft1, nftOtherCollection, nft2], [1, 1, 1]);
          });
        }
      });
      context('with Fungible and Non-Fungible Tokens', function () {
        context('multiple tokens sorted by Non-Fungible Collection transfer', function () {
          shouldBurnToken(burnFn, [fCollection1.id, nft1, fCollection2.id, nft2, nftOtherCollection], [2, 1, fCollection2.supply, 1, 1]);
        });
        if (interfaces.ERC1155Inventory) {
          context('multiple tokens not sorted by Non-Fungible Collection transfer', function () {
            shouldBurnToken(burnFn, [fCollection1.id, nft1, fCollection2.id, nftOtherCollection, nft2], [2, 1, fCollection2.supply, 1, 1]);
          });
        }
      });
    });
  });
}

module.exports = {
  shouldBehaveLikeERC1155Burnable,
};

const {artifacts, accounts, web3} = require('hardhat');
const {createFixtureLoader} = require('@animoca/ethereum-contracts-core_library/test/utils/fixture');
const {expectEventWithParamsOverride} = require('@animoca/ethereum-contracts-core_library/test/utils/events');
const {BN, expectEvent, expectRevert} = require('@openzeppelin/test-helpers');
const {One, ZeroAddress, MaxUInt256} = require('@animoca/ethereum-contracts-core_library/src/constants');

const ReceiverType = require('../../ReceiverType');

const {
  makeFungibleCollectionId,
  makeNonFungibleCollectionId,
  makeNonFungibleTokenId,
  isNonFungibleToken,
} = require('@animoca/blockchain-inventory_metadata').inventoryIds;

const ERC1155TokenReceiverMock = artifacts.require('ERC1155TokenReceiverMock');
const ERC721ReceiverMock = artifacts.require('ERC721ReceiverMock');

function shouldBehaveLikeERC1155Mintable({nfMaskLength, revertMessages, eventParamsOverrides, interfaces, methods, deploy, mint}) {
  const [deployer, minter, owner, _operator, _approved, other] = accounts;

  const {'safeMint(address,uint256,uint256,bytes)': safeMint, 'safeBatchMint(address,uint256[],uint256[],bytes)': safeBatchMint} = methods;

  if (safeMint === undefined) {
    console.log(
      `ERC1155721InventoryMintable: non-standard ERC1155 method safeMint(address,uint256,uint256,bytes)` +
        ` is not supported by ${contractName}, associated tests will be skipped`
    );
  }
  if (safeBatchMint === undefined) {
    console.log(
      `ERC1155721InventoryMintable: non-standard ERC1155 method safeBatchMint(address,uint256[],uint256[],bytes)` +
        ` is not supported by ${contractName}, associated tests will be skipped`
    );
  }

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

  describe('like a mintable ERC1155Inventory', function () {
    const fixtureLoader = createFixtureLoader(accounts, web3.eth.currentProvider);
    const fixture = async function () {
      this.token = await deploy(deployer);
      await this.token.addMinter(minter, {from: deployer});
      await mint(this.token, other, unknownFCollection.id, MaxUInt256, {from: minter});
      this.receiver721 = await ERC721ReceiverMock.new(true);
      this.receiver1155 = await ERC1155TokenReceiverMock.new(true);
      this.refusingReceiver1155 = await ERC1155TokenReceiverMock.new(false);
    };

    beforeEach(async function () {
      await fixtureLoader(fixture, this);
    });

    let receipt = null;

    const mintWasSuccessful = function (tokenIds, values, data, options, receiverType) {
      if (interfaces.ERC721 || interfaces.ERC1155Inventory) {
        it('[ERC721/ERC1155inventory] transfers the ownership of the Non-Fungible Token(s)', async function () {
          const ids = Array.isArray(tokenIds) ? tokenIds : [tokenIds];
          for (const id of ids) {
            if (isNonFungibleToken(id, nfMaskLength)) {
              (await this.token.ownerOf(id)).should.be.equal(this.toWhom);
            } else {
              await expectRevert(this.token.ownerOf(id), revertMessages.NonExistingNFT);
            }
          }
        });
      }

      if (interfaces.ERC721) {
        it('[ERC721] sets an empty approval for the Non-Fungible Token(s)', async function () {
          const ids = Array.isArray(tokenIds) ? tokenIds : [tokenIds];
          const nftIds = ids.filter((id) => isNonFungibleToken(id, nfMaskLength));
          for (const id of nftIds) {
            (await this.token.getApproved(id)).should.be.equal(ZeroAddress);
          }
        });
      }

      if (Array.isArray(tokenIds)) {
        it('emits a TransferBatch event', function () {
          expectEventWithParamsOverride(
            receipt,
            'TransferBatch',
            {
              _operator: options.from,
              _from: ZeroAddress,
              _to: this.toWhom,
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
              _from: ZeroAddress,
              _to: this.toWhom,
              _id: tokenIds,
              _value: values,
            },
            eventParamsOverrides
          );
        });
      }

      if (interfaces.ERC721) {
        it('[ERC721] emits Transfer event(s) for Non-Fungible Tokens', function () {
          const ids = Array.isArray(tokenIds) ? tokenIds : [tokenIds];
          for (const id of ids) {
            if (isNonFungibleToken(id, nfMaskLength)) {
              expectEventWithParamsOverride(
                receipt,
                'Transfer',
                {
                  _from: ZeroAddress,
                  _to: this.toWhom,
                  _tokenId: id,
                },
                eventParamsOverrides
              );
            }
          }
        });
      }

      it('adjusts recipient balances', async function () {
        const ids = Array.isArray(tokenIds) ? tokenIds : [tokenIds];
        const vals = Array.isArray(values) ? values : [values];
        for (let i = 0; i < ids.length; ++i) {
          const id = ids[i];
          const value = vals[i];
          (await this.token.balanceOf(this.toWhom, id)).should.be.bignumber.equal(new BN(value));
        }
      });

      if (interfaces.ERC721) {
        it('[ERC721] adjusts recipient NFT balance', async function () {
          const ids = Array.isArray(tokenIds) ? tokenIds : [tokenIds];
          const quantity = ids.filter((id) => isNonFungibleToken(id, nfMaskLength)).length;
          (await this.token.balanceOf(this.toWhom)).should.be.bignumber.equal(new BN(quantity));
        });
      }

      if (interfaces.ERC1155Inventory) {
        it('[ERC1155Inventory] adjusts recipient Non-Fungible Collection balances', async function () {
          const ids = Array.isArray(tokenIds) ? tokenIds : [tokenIds];
          const nbCollectionNFTs = ids.filter((id) => id == nft1 || id == nft2).length;
          const nbOtherCollectionNFTs = ids.filter((id) => id == nftOtherCollection).length;
          (await this.token.balanceOf(this.toWhom, nfCollection)).should.be.bignumber.equal(new BN(nbCollectionNFTs));
          (await this.token.balanceOf(this.toWhom, nfCollectionOther)).should.be.bignumber.equal(new BN(nbOtherCollectionNFTs));
        });
        it('[ERC1155Inventory] increases the Non-Fungible Collections total supply', async function () {
          const ids = Array.isArray(tokenIds) ? tokenIds : [tokenIds];
          const nbCollectionNFTs = ids.filter((id) => id == nft1 || id == nft2).length;
          const nbOtherCollectionNFTs = ids.filter((id) => id == nftOtherCollection).length;
          (await this.token.totalSupply(nfCollection)).should.be.bignumber.equal(new BN(nbCollectionNFTs));
          (await this.token.totalSupply(nfCollectionOther)).should.be.bignumber.equal(new BN(nbOtherCollectionNFTs));
        });

        it('[ERC1155Inventory] increases the Fungible Tokens total supply', async function () {
          const ids = Array.isArray(tokenIds) ? tokenIds : [tokenIds];
          const vals = Array.isArray(values) ? values : [values];
          for (let i = 0; i < ids.length; ++i) {
            const id = ids[i];
            const value = vals[i];
            if (id == fCollection1.id || id == fCollection2.id || id == fCollection3.id) {
              (await this.token.totalSupply(id)).should.be.bignumber.equal(new BN(value));
            }
          }
        });

        it('[ERC1155Inventory] sets total supply to 1 for the Non-Fungible Tokens', async function () {
          // (await this.token.totalSupply(nft1)).should.be.bignumber.equal(this.nftSupply.addn(1));
          const ids = Array.isArray(tokenIds) ? tokenIds : [tokenIds];
          const nftIds = ids.filter((id) => isNonFungibleToken(id, nfMaskLength));
          for (const id of nftIds) {
            (await this.token.totalSupply(id)).should.be.bignumber.equal(One);
          }
        });
      }

      if (receiverType == ReceiverType.ERC1155_RECEIVER) {
        if (Array.isArray(tokenIds)) {
          it('[ERC1155] should call onERC1155BatchReceived', async function () {
            await expectEvent.inTransaction(receipt.tx, ERC1155TokenReceiverMock, 'ReceivedBatch', {
              operator: options.from,
              from: ZeroAddress,
              ids: tokenIds,
              values: values,
              data: data,
            });
          });
        } else {
          it('[ERC1155] should call onERC1155Received', async function () {
            await expectEvent.inTransaction(receipt.tx, ERC1155TokenReceiverMock, 'ReceivedSingle', {
              operator: options.from,
              from: ZeroAddress,
              id: tokenIds,
              value: values,
              data: data,
            });
          });
        }
      }
    };

    const shouldRevertOnPreconditions = function (mintFunction) {
      const data = '0x42';
      const options = {from: minter};
      describe('Pre-conditions', function () {
        if (interfaces.Pausable) {
          it('[Pausable] reverts when paused', async function () {
            await this.token.pause({from: deployer});
            await expectRevert(mintFunction.call(this, owner, nft1, 1, data, options), revertMessages.Paused);
          });
        }
        it('reverts if the sender is not a Minter', async function () {
          await expectRevert(mintFunction.call(this, owner, nft1, 1, data, {from: other}), revertMessages.NotMinter);
        });

        it('reverts if transferred to the zero address', async function () {
          await expectRevert(mintFunction.call(this, ZeroAddress, nft1, 1, data, options), revertMessages.MintToZero);
        });

        it('reverts if a Fungible Token has a value equal 0', async function () {
          await expectRevert(mintFunction.call(this, other, fCollection1.id, 0, data, options), revertMessages.ZeroValue);
        });

        it('reverts if a Fungible Token has an overflowing supply', async function () {
          await expectRevert(mintFunction.call(this, other, unknownFCollection.id, 1, data, options), revertMessages.SupplyOverflow);
        });

        it('reverts if a Non-Fungible Token has a value different from 1', async function () {
          await expectRevert(mintFunction.call(this, other, nft1, 0, data, options), revertMessages.WrongNFTValue);
          await expectRevert(mintFunction.call(this, other, nft1, 2, data, options), revertMessages.WrongNFTValue);
        });

        it('reverts with an existing Non-Fungible Token', async function () {
          await mintFunction.call(this, owner, unknownNft, 1, data, options);
          await expectRevert(mintFunction.call(this, owner, unknownNft, 1, data, options), revertMessages.ExistingOrBurntNFT);
        });

        if (interfaces.ERC1155Inventory) {
          it('[ERC1155Inventory] reverts if the id is a Non-Fungible Collection', async function () {
            await expectRevert(mintFunction.call(this, owner, nfCollection, 1, data, options), revertMessages.NotToken);
          });
        }

        it('reverts when sent to a non-receiver contract', async function () {
          await expectRevert.unspecified(mintFunction.call(this, this.token.address, nft1, 1, data, options));
        });
        it('reverts when sent to an ERC721Receiver', async function () {
          await expectRevert.unspecified(mintFunction.call(this, this.receiver721.address, nft1, 1, data, options));
        });
        it('reverts when sent to an ERC1155TokenReceiver which refuses the transfer', async function () {
          await expectRevert(mintFunction.call(this, this.refusingReceiver1155.address, nft1, 1, data, options), revertMessages.TransferRejected);
        });
      });
    };

    const shouldMintTokenToRecipient = function (mintFunction, ids, values, data) {
      const options = {from: minter};

      context('when sent to a wallet', function () {
        beforeEach(async function () {
          this.toWhom = owner;
          receipt = await mintFunction.call(this, this.toWhom, ids, values, data, options);
        });
        mintWasSuccessful(ids, values, data, options, ReceiverType.WALLET);
      });

      context('when sent to an ERC1155TokenReceiver contract', function () {
        beforeEach(async function () {
          this.toWhom = this.receiver1155.address;
          receipt = await mintFunction.call(this, this.toWhom, ids, values, data, options);
        });
        mintWasSuccessful(ids, values, data, options, ReceiverType.ERC1155_RECEIVER);
      });

      if (interfaces.Pausable) {
        context('[Pausable] when called after unpausing', function () {
          beforeEach(async function () {
            await this.token.pause({from: deployer});
            await this.token.unpause({from: deployer});
            this.toWhom = owner;
            receipt = await mintFunction.call(this, this.toWhom, ids, values, data, options);
          });
          mintWasSuccessful(ids, values, data, options, ReceiverType.WALLET);
        });
      }
    };

    describe('safeMint(address,uint256,uint256,bytes)', function () {
      if (safeMint === undefined) {
        return;
      }

      const mintFn = async function (to, id, value, data, options) {
        return safeMint(this.token, to, id, value, data, options);
      };
      shouldRevertOnPreconditions(mintFn);
      context('with a Fungible Token', function () {
        shouldMintTokenToRecipient(mintFn, fCollection1.id, fCollection1.supply, '0x42');
      });
      context('with a Non-Fungible Token', function () {
        shouldMintTokenToRecipient(mintFn, nft1, 1, '0x42');
      });
    });

    describe('safeBatchMint(address,uint256[],uint256[],bytes)', function () {
      if (safeBatchMint === undefined) {
        return;
      }
      const mintFn = async function (to, ids, values, data, options) {
        const tokenIds = Array.isArray(ids) ? ids : [ids];
        const vals = Array.isArray(values) ? values : [values];
        return safeBatchMint(this.token, to, tokenIds, vals, data, options);
      };
      shouldRevertOnPreconditions(mintFn);
      it('reverts with inconsistent arrays', async function () {
        await expectRevert(mintFn.call(this, owner, [nft1, nft2], [1], '0x42', {from: minter}), revertMessages.InconsistentArrays);
      });
      context('with an empty list of tokens', function () {
        shouldMintTokenToRecipient(mintFn, [], [], '0x42');
      });
      context('with Fungible Tokens', function () {
        context('single partial balance transfer', function () {
          shouldMintTokenToRecipient(mintFn, [fCollection1.id], [1], '0x42');
        });
        context('single full balance transfer', function () {
          shouldMintTokenToRecipient(mintFn, [fCollection1.id], [fCollection1.supply], '0x42');
        });
        context('multiple tokens transfer', function () {
          shouldMintTokenToRecipient(
            mintFn,
            [fCollection1.id, fCollection2.id, fCollection3.id],
            [fCollection1.supply, 1, fCollection3.supply],
            '0x42'
          );
        });
      });
      context('with Non-Fungible Tokens', function () {
        context('single token transfer', function () {
          shouldMintTokenToRecipient(mintFn, [nft1], [1], '0x42');
        });
        context('multiple tokens from the same collection transfer', function () {
          shouldMintTokenToRecipient(mintFn, [nft1, nft2], [1, 1], '0x42');
        });
        context('multiple tokens sorted by collection transfer', function () {
          shouldMintTokenToRecipient(mintFn, [nft1, nft2, nftOtherCollection], [1, 1, 1], '0x42');
        });
        if (interfaces.ERC1155Inventory) {
          context('[ERC1155Inventory] multiple tokens not sorted by collection transfer', function () {
            shouldMintTokenToRecipient(mintFn, [nft1, nftOtherCollection, nft2], [1, 1, 1], '0x42');
          });
        }
      });
      context('with Fungible and Non-Fungible Tokens', function () {
        context('multiple tokens sorted by Non-Fungible Collection transfer', function () {
          shouldMintTokenToRecipient(
            mintFn,
            [fCollection1.id, nft1, fCollection2.id, nft2, nftOtherCollection],
            [2, 1, fCollection2.supply, 1, 1],
            '0x42'
          );
        });
        if (interfaces.ERC1155Inventory) {
          context('multiple tokens not sorted by Non-Fungible Collection transfer', function () {
            shouldMintTokenToRecipient(
              mintFn,
              [fCollection1.id, nft1, fCollection2.id, nftOtherCollection, nft2],
              [2, 1, fCollection2.supply, 1, 1],
              '0x42'
            );
          });
        }
      });
    });
  });
}

module.exports = {
  shouldBehaveLikeERC1155Mintable,
};

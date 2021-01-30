const {artifacts, accounts, web3} = require('hardhat');
const {createFixtureLoader} = require('@animoca/ethereum-contracts-core_library/test/utils/fixture');
const {expectEventWithParamsOverride} = require('@animoca/ethereum-contracts-core_library/test/utils/events');
const {BN, expectEvent, expectRevert} = require('@openzeppelin/test-helpers');
const {One, ZeroAddress} = require('@animoca/ethereum-contracts-core_library').constants;

const {
  makeNonFungibleTokenId,
  makeNonFungibleCollectionId,
  makeFungibleCollectionId,
} = require('@animoca/blockchain-inventory_metadata').inventoryIds;

const ReceiverType = require('../../ReceiverType');

const ERC721ReceiverMock = artifacts.require('ERC721ReceiverMock');
const ERC1155TokenReceiverMock = artifacts.require('ERC1155TokenReceiverMock');

function shouldBehaveLikeERC721Mintable({nfMaskLength, contractName, revertMessages, eventParamsOverrides, interfaces, methods, deploy}) {
  const [deployer, minter, owner] = accounts;

  const {
    'mint(address,uint256)': mint_ERC721,
    'batchMint(address,uint256[])': batchMint_ERC721,
    'safeMint(address,uint256,bytes)': safeMint_ERC721,
  } = methods;

  if (mint_ERC721 === undefined) {
    console.log(
      `ERC721Mintable: non-standard ERC721 method mint(address,uint256)` + ` is not supported by ${contractName}, associated tests will be skipped`
    );
  }
  if (batchMint_ERC721 === undefined) {
    console.log(
      `ERC721Mintable: non-standard ERC721 method batchMint(address,uint256[])` +
        `is not supported by ${contractName}, associated tests will be skipped`
    );
  }
  if (safeMint_ERC721 === undefined) {
    console.log(
      `ERC721Mintable: non-standard ERC721 method safeMint(address,uint256,bytes)` +
        ` is not supported by ${contractName}, associated tests will be skipped`
    );
  }

  const fungibleToken = makeFungibleCollectionId(1);
  const nfCollection = makeNonFungibleCollectionId(1, nfMaskLength);
  const otherNFCollection = makeNonFungibleCollectionId(2, nfMaskLength);
  const nft1 = makeNonFungibleTokenId(1, 1, nfMaskLength);
  const nft2 = makeNonFungibleTokenId(2, 1, nfMaskLength);
  const nftOtherCollection = makeNonFungibleTokenId(1, 2, nfMaskLength);
  const unknownNFT = makeNonFungibleTokenId(999, 1, nfMaskLength);

  describe('like a mintable ERC721', function () {
    const fixtureLoader = createFixtureLoader(accounts, web3.eth.currentProvider);
    const fixture = async function () {
      this.token = await deploy(deployer);
      await this.token.addMinter(minter, {from: deployer});
      this.receiver721 = await ERC721ReceiverMock.new(true);
      this.refusingReceiver721 = await ERC721ReceiverMock.new(false);
      this.receiver1155 = await ERC1155TokenReceiverMock.new(true);
      this.refusingReceiver1155 = await ERC1155TokenReceiverMock.new(false);
    };

    beforeEach(async function () {
      await fixtureLoader(fixture, this);
    });

    const mintWasSuccessful = function (ids, data, options, safe, receiverType) {
      it('gives the ownership of the token(s) to the given address', async function () {
        const nftIds = Array.isArray(ids) ? ids : [ids];
        for (const id of nftIds) {
          (await this.token.ownerOf(id)).should.be.equal(this.toWhom);
        }
      });

      it('has an empty approval for the token(s)', async function () {
        const nftIds = Array.isArray(ids) ? ids : [ids];
        for (const id of nftIds) {
          (await this.token.getApproved(id)).should.be.equal(ZeroAddress);
        }
      });

      it('emits Transfer event(s)', function () {
        const nftIds = Array.isArray(ids) ? ids : [ids];
        for (const id of nftIds) {
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
      });

      if (interfaces.ERC1155) {
        if (Array.isArray(ids)) {
          it('[ERC1155] emits a TransferBatch event', function () {
            expectEventWithParamsOverride(
              receipt,
              'TransferBatch',
              {
                _operator: options.from,
                _from: ZeroAddress,
                _to: this.toWhom,
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
                _from: ZeroAddress,
                _to: this.toWhom,
                _id: ids,
                _value: 1,
              },
              eventParamsOverrides
            );
          });
        }
      }

      it('adjusts recipient balance', async function () {
        const quantity = new BN(Array.isArray(ids) ? `${ids.length}` : '1');
        (await this.token.balanceOf(this.toWhom)).should.be.bignumber.equal(quantity);
      });

      if (interfaces.ERC1155Inventory) {
        it('[ERC1155Inventory] adjusts recipient Non-Fungible Collections balance', async function () {
          const nftsArray = Array.isArray(ids) ? ids : [ids];
          const nbCollectionNFTs = nftsArray.filter((id) => id != nftOtherCollection).length;
          const nbOtherCollectionNFTs = nftsArray.length - nbCollectionNFTs;
          (await this.token.balanceOf(this.toWhom, nfCollection)).should.be.bignumber.equal(new BN(nbCollectionNFTs));
          (await this.token.balanceOf(this.toWhom, otherNFCollection)).should.be.bignumber.equal(new BN(nbOtherCollectionNFTs));
        });

        it('[ERC1155Inventory] increases the Non-Fungible Collections total supply', async function () {
          const nftsArray = Array.isArray(ids) ? ids : [ids];
          const nbCollectionNFTs = nftsArray.filter((id) => id != nftOtherCollection).length;
          const nbOtherCollectionNFTs = nftsArray.length - nbCollectionNFTs;
          (await this.token.totalSupply(nfCollection)).should.be.bignumber.equal(new BN(nbCollectionNFTs));
          (await this.token.totalSupply(otherNFCollection)).should.be.bignumber.equal(new BN(nbOtherCollectionNFTs));
        });
      }

      if (safe && receiverType == ReceiverType.ERC721_RECEIVER) {
        it('should call onERC721Received', async function () {
          await expectEvent.inTransaction(receipt.tx, ERC721ReceiverMock, 'Received', {
            from: ZeroAddress,
            tokenId: ids,
            data: data ? data : null,
          });
        });
      } else if (interfaces.ERC1155) {
        if (receiverType == ReceiverType.ERC1155_RECEIVER) {
          if (Array.isArray(ids)) {
            it('[ERC1155] should call onERC1155BatchReceived', async function () {
              await expectEvent.inTransaction(receipt.tx, ERC1155TokenReceiverMock, 'ReceivedBatch', {
                operator: options.from,
                from: ZeroAddress,
                ids: ids,
                values: ids.map(() => 1),
                data: data ? data : null,
              });
            });
          } else {
            it('[ERC1155] should call onERC1155Received', async function () {
              await expectEvent.inTransaction(receipt.tx, ERC1155TokenReceiverMock, 'ReceivedSingle', {
                operator: options.from,
                from: ZeroAddress,
                id: ids,
                value: 1,
                data: data ? data : null,
              });
            });
          }
        }
      }
    };

    const shouldRevertOnPreconditions = function (mintFunction, safe) {
      describe('Pre-conditions', function () {
        const data = '0x42';
        const options = {from: minter};
        if (interfaces.Pausable) {
          it('[Pausable] reverts when paused', async function () {
            await this.token.pause({from: deployer});
            await expectRevert(mintFunction.call(this, owner, nft1, data, options), revertMessages.Paused);
          });
        }
        it('reverts if minted to the zero address', async function () {
          await expectRevert(mintFunction.call(this, ZeroAddress, nft1, data, options), revertMessages.MintToZero);
        });

        it('reverts if the token already exist', async function () {
          await mintFunction.call(this, owner, unknownNFT, data, options);
          await expectRevert(mintFunction.call(this, owner, unknownNFT, data, options), revertMessages.ExistingOrBurntNFT);
        });

        it('reverts if sent by a non-minter', async function () {
          await expectRevert(mintFunction.call(this, owner, nft1, data, {from: owner}), revertMessages.NotMinter);
        });

        if (safe) {
          it('reverts when sent to a non-receiver contract', async function () {
            await expectRevert.unspecified(mintFunction.call(this, this.token.address, nft1, data, options));
          });
          it('reverts when sent to an ERC721Receiver which refuses the transfer', async function () {
            await expectRevert(mintFunction.call(this, this.refusingReceiver721.address, nft1, data, options), revertMessages.TransferRejected);
          });
          if (interfaces.ERC1155) {
            it('reverts when sent to an ERC1155TokenReceiver which refuses the transfer', async function () {
              await expectRevert(mintFunction.call(this, this.refusingReceiver1155.address, nft1, data, options), revertMessages.TransferRejected);
            });
          } else {
            it('reverts when sent to an ERC1155TokenReceiver', async function () {
              await expectRevert.unspecified(mintFunction.call(this, this.receiver1155.address, nft1, data, options));
            });
          }
        }

        if (interfaces.ERC1155Inventory) {
          it('[ERC1155] reverts if the id is a Fungible Token', async function () {
            await expectRevert(mintFunction.call(this, owner, fungibleToken, data, options), revertMessages.NotNFT);
          });
        }

        if (interfaces.ERC1155Inventory) {
          it('[ERC1155Inventory] reverts if the id is a Non-Fungible Collection', async function () {
            await expectRevert(mintFunction.call(this, owner, nfCollection, data, options), revertMessages.NotNFT);
          });
        }
      });
    };

    const shouldMintTokenToRecipient = function (mintFunction, ids, data, safe) {
      const options = {from: minter};

      context('when sent to a wallet', function () {
        beforeEach(async function () {
          this.toWhom = owner;
          receipt = await mintFunction.call(this, this.toWhom, ids, data, options);
        });
        mintWasSuccessful(ids, data, options, safe, ReceiverType.WALLET);
      });

      if (interfaces.Pausable) {
        context('[Pausable] when called after unpausing', function () {
          beforeEach(async function () {
            await this.token.pause({from: deployer});
            await this.token.unpause({from: deployer});
            this.toWhom = owner;
            receipt = await mintFunction.call(this, this.toWhom, ids, data, options);
          });
          mintWasSuccessful(ids, data, options, safe, ReceiverType.WALLET);
        });
      }

      context('when sent to an ERC721Receiver contract', function () {
        beforeEach(async function () {
          this.toWhom = this.receiver721.address;
          receipt = await mintFunction.call(this, this.toWhom, ids, data, options);
        });
        mintWasSuccessful(ids, data, options, safe, ReceiverType.ERC721_RECEIVER);
      });

      if (interfaces.ERC1155) {
        context('when sent to an ERC1155TokenReceiver contract', function () {
          beforeEach(async function () {
            this.toWhom = this.receiver1155.address;
            receipt = await mintFunction.call(this, this.toWhom, ids, data, options);
          });
          mintWasSuccessful(ids, data, options, safe, ReceiverType.ERC1155_RECEIVER);
        });
      }
    };

    context('mint(address,uint256)', function () {
      if (mint_ERC721 === undefined) {
        return;
      }

      const mintFn = async function (to, tokenId, _data, options) {
        return mint_ERC721(this.token, to, tokenId, options);
      };
      const safe = false;
      shouldRevertOnPreconditions(mintFn, safe);
      shouldMintTokenToRecipient(mintFn, nft1, undefined, safe);
    });

    context('batchMint(address,uint256[])', function () {
      if (batchMint_ERC721 === undefined) {
        return;
      }

      const mintFn = async function (to, tokenIds, _data, options) {
        const ids = Array.isArray(tokenIds) ? tokenIds : [tokenIds];
        return batchMint_ERC721(this.token, to, ids, options);
      };
      const safe = false;
      shouldRevertOnPreconditions(mintFn, safe);
      context('with an empty list of tokens', function () {
        shouldMintTokenToRecipient(mintFn, [], undefined, safe);
      });
      context('with a single token', function () {
        shouldMintTokenToRecipient(mintFn, [nft1], undefined, safe);
      });
      context('with a list of tokens from the same collection', function () {
        shouldMintTokenToRecipient(mintFn, [nft1, nft2], undefined, safe);
      });
      if (interfaces.ERC1155Inventory) {
        context('[ERC1155Inventory] with a list of tokens sorted by collection', function () {
          shouldMintTokenToRecipient(mintFn, [nft1, nft2, nftOtherCollection], undefined, safe);
        });
        context('[ERC1155Inventory] with an unsorted list of tokens from different collections', function () {
          shouldMintTokenToRecipient(mintFn, [nft1, nftOtherCollection, nft2], undefined, safe);
        });
      }
    });

    context('safeMint(address,uint256,bytes)', function () {
      if (safeMint_ERC721 === undefined) {
        return;
      }

      const mintFn = async function (to, tokenId, data, options) {
        return safeMint_ERC721(this.token, to, tokenId, data, options);
      };
      const safe = true;
      shouldRevertOnPreconditions(mintFn, safe);
      shouldMintTokenToRecipient(mintFn, nft1, '0x42', safe);
    });
  });
}

module.exports = {
  shouldBehaveLikeERC721Mintable,
};

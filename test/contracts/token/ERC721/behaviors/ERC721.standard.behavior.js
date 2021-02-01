const {artifacts, accounts, web3} = require('hardhat');
const {createFixtureLoader} = require('@animoca/ethereum-contracts-core_library/test/utils/fixture');
const {expectEventWithParamsOverride} = require('@animoca/ethereum-contracts-core_library/test/utils/events');
const {BN, expectEvent, expectRevert} = require('@openzeppelin/test-helpers');

const {behaviors, constants, interfaces: interfaces165} = require('@animoca/ethereum-contracts-core_library');
const {ZeroAddress} = constants;
const interfaces721 = require('../../../../../src/interfaces/ERC165/ERC721');

const {
  makeNonFungibleTokenId,
  makeNonFungibleCollectionId,
  makeFungibleCollectionId,
} = require('@animoca/blockchain-inventory_metadata').inventoryIds;

const ReceiverType = require('../../ReceiverType');

const ERC721ReceiverMock = artifacts.require('ERC721ReceiverMock');
const ERC1155TokenReceiverMock = artifacts.require('ERC1155TokenReceiverMock');

function shouldBehaveLikeERC721Standard({nfMaskLength, contractName, revertMessages, eventParamsOverrides, interfaces, methods, deploy, mint}) {
  const [deployer, minter, owner, approved, anotherApproved, operator, other] = accounts;

  const {'batchTransferFrom(address,address,uint256[])': batchTransferFrom_ERC721} = methods;

  if (batchTransferFrom_ERC721 === undefined) {
    console.log(
      `ERC721: non-standard ERC721 method batchTransfer(address,uint256[]) is not supported by ${contractName}, associated tests will be skipped`
    );
  }
  const fungibleToken = makeFungibleCollectionId(1);
  const nfCollection = makeNonFungibleCollectionId(1, nfMaskLength);
  const otherNFCollection = makeNonFungibleCollectionId(2, nfMaskLength);
  const nft1 = makeNonFungibleTokenId(1, 1, nfMaskLength);
  const nft2 = makeNonFungibleTokenId(2, 1, nfMaskLength);
  const nft3 = makeNonFungibleTokenId(3, 1, nfMaskLength);
  const nftOtherCollection = makeNonFungibleTokenId(1, 2, nfMaskLength);
  const unknownNFT = makeNonFungibleTokenId(999, 1, nfMaskLength);

  describe('like an standard ERC721', function () {
    const fixtureLoader = createFixtureLoader(accounts, web3.eth.currentProvider);
    const fixture = async function () {
      this.token = await deploy(deployer);
      await this.token.addMinter(minter, {from: deployer});
      await mint(this.token, owner, fungibleToken, 1, {from: minter});
      await mint(this.token, owner, nft1, 1, {from: minter});
      await mint(this.token, owner, nft2, 1, {from: minter});
      await mint(this.token, owner, nft3, 1, {from: minter});
      await mint(this.token, owner, nftOtherCollection, 1, {from: minter});
      await this.token.approve(approved, nft1, {from: owner});
      await this.token.approve(approved, nft2, {from: owner});
      await this.token.approve(approved, nftOtherCollection, {from: owner});
      await this.token.setApprovalForAll(operator, true, {from: owner});
      this.receiver721 = await ERC721ReceiverMock.new(true);
      this.refusingReceiver721 = await ERC721ReceiverMock.new(false);
      this.receiver1155 = await ERC1155TokenReceiverMock.new(true);
      this.refusingReceiver1155 = await ERC1155TokenReceiverMock.new(false);

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
      this.toWhom = other; // default to anyone for toWhom in context-dependent tests
    });

    describe('balanceOf(address)', function () {
      context('when the given address owns some tokens', function () {
        it('returns the amount of tokens owned by the given address', async function () {
          // fungible minting is interpreted as non-fungible minting in ERC721-only implementations
          const balance = interfaces.ERC1155Inventory ? '4' : '5';
          (await this.token.balanceOf(owner)).should.be.bignumber.equal(balance);
        });
      });

      context('when the given address does not own any tokens', function () {
        it('returns 0', async function () {
          (await this.token.balanceOf(other)).should.be.bignumber.equal('0');
        });
      });

      context('when querying the zero address', function () {
        it('throws', async function () {
          await expectRevert(this.token.balanceOf(ZeroAddress), revertMessages.ZeroAddress);
        });
      });
    });

    describe('ownerOf(uint256)', function () {
      context('when the given token ID was tracked by this token', function () {
        const tokenId = nft1;

        it('returns the owner of the given token ID', async function () {
          (await this.token.ownerOf(tokenId)).should.be.equal(owner);
        });
      });

      it('reverts if the token does not exist', async function () {
        await expectRevert(this.token.ownerOf(unknownNFT), revertMessages.NonExistingNFT);
      });
    });

    describe('transfers', function () {
      let receipt = null;

      const transferWasSuccessful = function (tokenIds, data, options, safe, receiverType, selfTransfer) {
        const ids = Array.isArray(tokenIds) ? tokenIds : [tokenIds];

        if (selfTransfer) {
          it('does not affect the token(s) ownership', async function () {
            for (const id of ids) {
              (await this.token.ownerOf(id)).should.be.equal(owner);
            }
          });
        } else {
          it('gives the token(s) ownership to the recipient', async function () {
            for (const id of ids) {
              (await this.token.ownerOf(id)).should.be.equal(this.toWhom);
            }
          });
        }

        it('clears the approval for the token(s)', async function () {
          for (const id of ids) {
            (await this.token.getApproved(id)).should.be.equal(ZeroAddress);
          }
        });

        it('emits Transfer event(s)', function () {
          for (const id of ids) {
            expectEventWithParamsOverride(
              receipt,
              'Transfer',
              {
                _from: owner,
                _to: this.toWhom,
                _tokenId: id,
              },
              eventParamsOverrides
            );
          }
        });

        if (interfaces.ERC1155) {
          if (Array.isArray(tokenIds)) {
            it('[ERC1155] emits a TransferBatch event', function () {
              expectEventWithParamsOverride(
                receipt,
                'TransferBatch',
                {
                  _operator: options.from,
                  _from: owner,
                  _to: this.toWhom,
                  _ids: tokenIds,
                  _values: tokenIds.map(() => 1),
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
                  _to: this.toWhom,
                  _id: tokenIds,
                  _value: 1,
                },
                eventParamsOverrides
              );
            });
          }
        }

        if (selfTransfer) {
          it('does not affect the sender balance', async function () {
            (await this.token.balanceOf(owner)).should.be.bignumber.equal(this.nftBalance);
          });
        } else {
          it('decreases the sender balance', async function () {
            (await this.token.balanceOf(owner)).should.be.bignumber.equal(this.nftBalance.subn(ids.length));
          });

          it('increases the recipient balance', async function () {
            (await this.token.balanceOf(this.toWhom)).should.be.bignumber.equal(new BN(ids.length));
          });
        }

        if (interfaces.ERC1155Inventory) {
          if (selfTransfer) {
            it('[ERC1155Inventory] does not affect the sender Non-Fungible Collection balance(s)', async function () {
              (await this.token.balanceOf(owner, nfCollection)).should.be.bignumber.equal(this.nfcBalance);
              (await this.token.balanceOf(owner, otherNFCollection)).should.be.bignumber.equal(this.otherNFCBalance);
            });
          } else {
            const nbCollectionNFTs = ids.filter((id) => id != nftOtherCollection).length;
            const nbOtherCollectionNFTs = ids.length - nbCollectionNFTs;

            it('[ERC1155Inventory] decreases the sender Non-Fungible Collection balance(s)', async function () {
              (await this.token.balanceOf(owner, nfCollection)).should.be.bignumber.equal(this.nfcBalance.subn(nbCollectionNFTs));
              (await this.token.balanceOf(owner, otherNFCollection)).should.be.bignumber.equal(this.otherNFCBalance.subn(nbOtherCollectionNFTs));
            });

            it('[ERC1155Inventory] increases the recipient Non-Fungible Collection balance(s)', async function () {
              (await this.token.balanceOf(this.toWhom, nfCollection)).should.be.bignumber.equal(new BN(nbCollectionNFTs));
              (await this.token.balanceOf(this.toWhom, otherNFCollection)).should.be.bignumber.equal(new BN(nbOtherCollectionNFTs));
            });
          }

          it('[ERC1155Inventory] does not affect the Non-Fungible Collections total supply', async function () {
            (await this.token.totalSupply(nfCollection)).should.be.bignumber.equal(this.nfcSupply);
            (await this.token.totalSupply(otherNFCollection)).should.be.bignumber.equal(this.otherNFCSupply);
          });
        }

        if (safe && receiverType == ReceiverType.ERC721_RECEIVER) {
          it('should call onERC721Received', async function () {
            await expectEvent.inTransaction(receipt.tx, ERC721ReceiverMock, 'Received', {
              from: owner,
              tokenId: tokenIds,
              data: data ? data : null,
            });
          });
        } else if (interfaces.ERC1155 && receiverType == ReceiverType.ERC1155_RECEIVER) {
          if (Array.isArray(tokenIds)) {
            it('[ERC1155] should call onERC1155BatchReceived', async function () {
              await expectEvent.inTransaction(receipt.tx, ERC1155TokenReceiverMock, 'ReceivedBatch', {
                operator: options.from,
                from: owner,
                ids: tokenIds,
                values: tokenIds.map(() => 1),
                data: data ? data : null,
              });
            });
          } else {
            it('[ERC1155] should call onERC1155Received', async function () {
              await expectEvent.inTransaction(receipt.tx, ERC1155TokenReceiverMock, 'ReceivedSingle', {
                operator: options.from,
                from: owner,
                id: tokenIds,
                value: 1,
                data: data ? data : null,
              });
            });
          }
        }
      };

      const shouldTransferTokenBySender = function (transferFunction, ids, data, safe, receiverType, selfTransfer = false) {
        context('when called by the owner', function () {
          const options = {from: owner};
          beforeEach(async function () {
            receipt = await transferFunction.call(this, owner, this.toWhom, ids, data, options);
          });
          transferWasSuccessful(ids, data, options, safe, receiverType, selfTransfer);
        });

        if (interfaces.Pausable) {
          context('[Pausable] when called after unpausing', function () {
            const options = {from: owner};
            beforeEach(async function () {
              await this.token.pause({from: deployer});
              await this.token.unpause({from: deployer});
              receipt = await transferFunction.call(this, owner, this.toWhom, ids, data, options);
            });
            transferWasSuccessful(ids, data, options, safe, receiverType, selfTransfer);
          });
        }

        context('when called by a wallet with single token approval', function () {
          const options = {from: approved};
          beforeEach(async function () {
            receipt = await transferFunction.call(this, owner, this.toWhom, ids, data, options);
          });
          transferWasSuccessful(ids, data, options, safe, receiverType, selfTransfer);
        });

        context('when called by an operator', function () {
          const options = {from: operator};
          beforeEach(async function () {
            receipt = await transferFunction.call(this, owner, this.toWhom, ids, data, options);
          });
          transferWasSuccessful(ids, data, options, safe, receiverType, selfTransfer);
        });
      };

      const shouldRevertOnPreconditions = function (transferFunction, safe) {
        describe('Pre-conditions', function () {
          const data = '0x42';
          if (interfaces.Pausable) {
            it('[Pausable] reverts when paused', async function () {
              await this.token.pause({from: deployer});
              await expectRevert(transferFunction.call(this, owner, other, nft1, data, {from: owner}), revertMessages.Paused);
            });
          }
          it('reverts if transferred to the zero address', async function () {
            await expectRevert(transferFunction.call(this, owner, ZeroAddress, nft1, data, {from: owner}), revertMessages.TransferToZero);
          });

          it('reverts if the token does not exist', async function () {
            await expectRevert(transferFunction.call(this, owner, other, unknownNFT, data, {from: owner}), revertMessages.NonOwnedNFT);
          });

          it('reverts if `from` is not the token owner', async function () {
            await expectRevert(transferFunction.call(this, other, other, nft1, data, {from: other}), revertMessages.NonOwnedNFT);
          });

          it('reverts if the sender is not authorized for the token', async function () {
            await expectRevert(transferFunction.call(this, owner, other, nft1, data, {from: other}), revertMessages.NonApproved);
          });

          if (interfaces.ERC1155) {
            it('[ERC1155] reverts if the id is a Fungible Token', async function () {
              await expectRevert(transferFunction.call(this, owner, owner, fungibleToken, data, {from: owner}), revertMessages.NonOwnedNFT);
            });
          }

          if (interfaces.ERC1155Inventory) {
            it('[ERC1155Inventory] reverts if the id is a Non-Fungible Collection', async function () {
              await expectRevert(transferFunction.call(this, owner, owner, nfCollection, data, {from: owner}), revertMessages.NonOwnedNFT);
            });
          }

          if (safe) {
            it('reverts when sent to a non-receiver contract', async function () {
              await expectRevert.unspecified(transferFunction.call(this, owner, this.token.address, nft1, data, {from: owner}));
            });
            it('reverts when sent to an ERC721Receiver which refuses the transfer', async function () {
              await expectRevert(
                transferFunction.call(this, owner, this.refusingReceiver721.address, nft1, data, {
                  from: owner,
                }),
                revertMessages.TransferRejected
              );
            });
            if (interfaces.ERC1155) {
              it('[ERC1155] reverts when sent to an ERC1155TokenReceiver which refuses the transfer', async function () {
                await expectRevert(
                  transferFunction.call(this, owner, this.refusingReceiver1155.address, nft1, data, {
                    from: owner,
                  }),
                  revertMessages.TransferRejected
                );
              });
            } else {
              it('reverts when sent to an ERC1155TokenReceiver', async function () {
                await expectRevert.unspecified(
                  transferFunction.call(this, owner, this.receiver1155.address, nft1, data, {
                    from: owner,
                  })
                );
              });
            }
          }
        });
      };

      const shouldTransferTokenToRecipient = function (transferFunction, ids, data, safe) {
        context('when sent to another wallet', function () {
          beforeEach(async function () {
            this.toWhom = other;
          });
          shouldTransferTokenBySender(transferFunction, ids, data, safe, ReceiverType.WALLET);
        });

        context('when sent to the same owner', function () {
          beforeEach(async function () {
            this.toWhom = owner;
          });
          const selfTransfer = true;
          shouldTransferTokenBySender(transferFunction, ids, data, safe, ReceiverType.WALLET, selfTransfer);
        });

        context('when sent to an ERC721Receiver contract', function () {
          beforeEach(async function () {
            this.toWhom = this.receiver721.address;
          });
          shouldTransferTokenBySender(transferFunction, ids, data, safe, ReceiverType.ERC721_RECEIVER);
        });

        if (interfaces.ERC1155) {
          context('[ERC1155] when sent to an ERC1155TokenReceiver contract', function () {
            beforeEach(async function () {
              this.toWhom = this.receiver1155.address;
            });
            shouldTransferTokenBySender(transferFunction, ids, data, safe, ReceiverType.ERC1155_RECEIVER);
          });
        }
      };

      describe('transferFrom(address,address,uint256)', function () {
        const transferFn = async function (from, to, tokenId, _data, options) {
          return this.token.transferFrom(from, to, tokenId, options);
        };
        const safe = false;
        shouldRevertOnPreconditions(transferFn, safe);
        shouldTransferTokenToRecipient(transferFn, nft1, undefined, safe);
      });

      describe('batchTransferFrom(address,address,uint256[])', function () {
        if (batchTransferFrom_ERC721 === undefined) {
          return;
        }

        const transferFn = async function (from, to, tokenIds, _data, options) {
          const ids = Array.isArray(tokenIds) ? tokenIds : [tokenIds];
          return batchTransferFrom_ERC721(this.token, from, to, ids, options);
        };
        const safe = false;
        shouldRevertOnPreconditions(transferFn, safe);
        context('with an empty list of tokens', function () {
          shouldTransferTokenToRecipient(transferFn, [], undefined, safe);
        });
        context('with a single token', function () {
          shouldTransferTokenToRecipient(transferFn, [nft1], undefined, safe);
        });
        context('with a list of tokens from the same collection', function () {
          shouldTransferTokenToRecipient(transferFn, [nft1, nft2], undefined, safe);
        });
        if (interfaces.ERC1155Inventory) {
          context('[ERC1155Inventory] with a list of tokens sorted by collection', function () {
            shouldTransferTokenToRecipient(transferFn, [nft1, nft2, nftOtherCollection], undefined, safe);
          });
          context('[ERC1155Inventory] with an unsorted list of tokens from different collections', function () {
            shouldTransferTokenToRecipient(transferFn, [nft1, nftOtherCollection, nft2], undefined, safe);
          });
        }
      });

      describe('safeTransferFrom(address,address,uint256)', function () {
        const transferFn = async function (from, to, tokenId, _data, options) {
          return this.token.methods['safeTransferFrom(address,address,uint256)'](from, to, tokenId, options);
        };
        const safe = true;
        shouldRevertOnPreconditions(transferFn, safe);
        shouldTransferTokenToRecipient(transferFn, nft1, undefined, safe);
      });

      describe('safeTransferFrom(address,address,uint256,bytes)', function () {
        const transferFn = async function (from, to, tokenId, data, options) {
          return this.token.methods['safeTransferFrom(address,address,uint256,bytes)'](from, to, tokenId, data, options);
        };
        const safe = true;
        shouldRevertOnPreconditions(transferFn, safe);
        shouldTransferTokenToRecipient(transferFn, nft1, '0x42', safe);
      });
    });

    describe('approve', function () {
      const tokenId = nft3;

      let receipt = null;

      const itClearsApproval = function () {
        it('clears approval for the token', async function () {
          (await this.token.getApproved(tokenId)).should.be.equal(ZeroAddress);
        });
      };

      const itApproves = function (address) {
        it('sets the approval for the target address', async function () {
          (await this.token.getApproved(tokenId)).should.be.equal(address);
        });
      };

      const itEmitsApprovalEvent = function (address) {
        it('emits an Approval event', async function () {
          expectEventWithParamsOverride(
            receipt,
            'Approval',
            {
              _owner: owner,
              _approved: address,
              _tokenId: tokenId,
            },
            eventParamsOverrides
          );
        });
      };

      context('when clearing approval', function () {
        context('when there was no prior approval', function () {
          beforeEach(async function () {
            receipt = await this.token.approve(ZeroAddress, tokenId, {from: owner});
          });

          itClearsApproval();
          itEmitsApprovalEvent(ZeroAddress);
        });

        context('when there was a prior approval', function () {
          beforeEach(async function () {
            await this.token.approve(approved, tokenId, {from: owner});
            receipt = await this.token.approve(ZeroAddress, tokenId, {from: owner});
          });

          itClearsApproval();
          itEmitsApprovalEvent(ZeroAddress);
        });
      });

      context('when approving a non-zero address', function () {
        context('when there was no prior approval', function () {
          beforeEach(async function () {
            receipt = await this.token.approve(approved, tokenId, {from: owner});
          });

          itApproves(approved);
          itEmitsApprovalEvent(approved);
        });

        context('when there was a prior approval to the same address', function () {
          beforeEach(async function () {
            await this.token.approve(approved, tokenId, {from: owner});
            receipt = await this.token.approve(approved, tokenId, {from: owner});
          });

          itApproves(approved);
          itEmitsApprovalEvent(approved);
        });

        context('when there was a prior approval to a different address', function () {
          beforeEach(async function () {
            await this.token.approve(approved, tokenId, {from: owner});
            receipt = await this.token.approve(anotherApproved, tokenId, {from: owner});
          });

          itApproves(anotherApproved);
          itEmitsApprovalEvent(anotherApproved);
        });
      });

      it('reverts in case of self-approval', async function () {
        await expectRevert(this.token.approve(owner, tokenId, {from: owner}), revertMessages.SelfApproval);
      });

      it('reverts if the sender does not own the Non-Fungible Token', async function () {
        await expectRevert(this.token.approve(approved, tokenId, {from: other}), revertMessages.NonApproved);
      });

      it('reverts if the sender is approved for the given Non-Fungible Token', async function () {
        await this.token.approve(approved, tokenId, {from: owner});
        await expectRevert(this.token.approve(anotherApproved, tokenId, {from: approved}), revertMessages.NonApproved);
      });

      context('when the sender is an operator', function () {
        beforeEach(async function () {
          await this.token.setApprovalForAll(operator, true, {from: owner});
          receipt = await this.token.approve(approved, tokenId, {from: operator});
        });

        itApproves(approved);
        itEmitsApprovalEvent(approved);
      });

      it('reverts if the Non-Fungible Token does not exist', async function () {
        await expectRevert(this.token.approve(approved, unknownNFT, {from: operator}), revertMessages.NonExistingNFT);
      });
    });

    describe('setApprovalForAll', function () {
      context('when the operator willing to approve is not the owner', function () {
        context('when there is no operator approval set by the sender', function () {
          it('approves the operator', async function () {
            await this.token.setApprovalForAll(operator, true, {from: owner});

            (await this.token.isApprovedForAll(owner, operator)).should.equal(true);
          });

          it('emits an approval event', async function () {
            const receipt = await this.token.setApprovalForAll(operator, true, {from: owner});
            expectEventWithParamsOverride(
              receipt,
              'ApprovalForAll',
              {
                _owner: owner,
                _operator: operator,
                _approved: true,
              },
              eventParamsOverrides
            );
          });
        });

        context('when the operator was set as not approved', function () {
          beforeEach(async function () {
            await this.token.setApprovalForAll(operator, false, {from: owner});
          });

          it('approves the operator', async function () {
            await this.token.setApprovalForAll(operator, true, {from: owner});

            (await this.token.isApprovedForAll(owner, operator)).should.equal(true);
          });

          it('emits an approval event', async function () {
            receipt = await this.token.setApprovalForAll(operator, true, {from: owner});

            expectEventWithParamsOverride(
              receipt,
              'ApprovalForAll',
              {
                _owner: owner,
                _operator: operator,
                _approved: true,
              },
              eventParamsOverrides
            );
          });

          it('can unset the operator approval', async function () {
            await this.token.setApprovalForAll(operator, false, {from: owner});

            (await this.token.isApprovedForAll(owner, operator)).should.equal(false);
          });
        });

        context('when the operator was already approved', function () {
          beforeEach(async function () {
            await this.token.setApprovalForAll(operator, true, {from: owner});
          });

          it('keeps the approval to the given address', async function () {
            await this.token.setApprovalForAll(operator, true, {from: owner});

            (await this.token.isApprovedForAll(owner, operator)).should.equal(true);
          });

          it('emits an approval event', async function () {
            const receipt = await this.token.setApprovalForAll(operator, true, {from: owner});

            expectEventWithParamsOverride(
              receipt,
              'ApprovalForAll',
              {
                _owner: owner,
                _operator: operator,
                _approved: true,
              },
              eventParamsOverrides
            );
          });
        });
      });

      it('reverts in case self-operator-approval', async function () {
        await expectRevert(this.token.setApprovalForAll(owner, true, {from: owner}), revertMessages.SelfApprovalForAll);
      });
    });

    behaviors.shouldSupportInterfaces([interfaces165.ERC165, interfaces721.ERC721]);
  });
}

module.exports = {
  shouldBehaveLikeERC721Standard,
};

const {artifacts, accounts, web3} = require('hardhat');
const {createFixtureLoader} = require('@animoca/ethereum-contracts-core_library/test/utils/fixture');
const {expectEventWithParamsOverride} = require('@animoca/ethereum-contracts-core_library/test/utils/events');
const {BN, expectEvent, expectRevert} = require('@openzeppelin/test-helpers');
const interfaces1155 = require('../../../../../src/interfaces/ERC165/ERC1155');
const {behaviors, constants, interfaces: interfaces165} = require('@animoca/ethereum-contracts-core_library');
const {ZeroAddress} = constants;

const ReceiverType = require('../../ReceiverType');

const {
  isFungible,
  isNonFungibleToken,
  makeFungibleCollectionId,
  makeNonFungibleCollectionId,
  makeNonFungibleTokenId,
} = require('@animoca/blockchain-inventory_metadata').inventoryIds;
const {Zero, One} = require('@animoca/ethereum-contracts-core_library/src/constants');

const ERC1155TokenReceiverMock = artifacts.require('ERC1155TokenReceiverMock');
const ERC721ReceiverMock = artifacts.require('ERC721ReceiverMock');

function shouldBehaveLikeERC1155Standard({nfMaskLength, revertMessages, eventParamsOverrides, interfaces, deploy, mint}) {
  const [deployer, minter, owner, operator, approved, other] = accounts;

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

  describe('like an ERC1155StandardInventory', function () {
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
        await this.token.approve(approved, nftOtherCollection, {from: owner});
      }
      this.receiver721 = await ERC721ReceiverMock.new(true);
      this.receiver1155 = await ERC1155TokenReceiverMock.new(true);
      this.refusingReceiver1155 = await ERC1155TokenReceiverMock.new(false);

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
      this.toWhom = other; // default to anyone for toWhom in context-dependent tests
    });

    describe('balanceOf', function () {
      it('reverts when queried about the zero address', async function () {
        await expectRevert(this.token.balanceOf(ZeroAddress, nft1), revertMessages.ZeroAddress);
      });

      context('when the given address owns some tokens', function () {
        it('returns 1 for each Non-Fungible Token owned', async function () {
          (await this.token.balanceOf(owner, nft1)).should.be.bignumber.equal('1');
          (await this.token.balanceOf(owner, nft2)).should.be.bignumber.equal('1');
          (await this.token.balanceOf(owner, nftOtherCollection)).should.be.bignumber.equal('1');
        });

        it('returns the balance of owned Non-Fungible Tokens by Non-Fungible Collection', async function () {
          (await this.token.balanceOf(owner, nfCollection)).should.be.bignumber.equal('2');
          (await this.token.balanceOf(owner, nfCollectionOther)).should.be.bignumber.equal('1');
        });

        it('returns the balance of Fungible Tokens owned by the given address', async function () {
          (await this.token.balanceOf(owner, fCollection1.id)).should.be.bignumber.equal(new BN(fCollection1.supply));
          (await this.token.balanceOf(owner, fCollection2.id)).should.be.bignumber.equal(new BN(fCollection2.supply));
        });
      });

      context('when the given address does not own any tokens', function () {
        it('returns 0 for a Non-Fungible Token id', async function () {
          (await this.token.balanceOf(other, nft1)).should.be.bignumber.equal('0');
        });

        it('returns 0 for an Non-Fungible Collection id', async function () {
          (await this.token.balanceOf(other, nfCollection)).should.be.bignumber.equal('0');
        });

        it('returns 0 for a Fungible Token id', async function () {
          (await this.token.balanceOf(other, fCollection1.id)).should.be.bignumber.equal('0');
        });
      });

      context('when querying the zero address', function () {
        // const revertMessage = "Inventory: zero address";
        it('reverts with a Non-Fungible Token id', async function () {
          await expectRevert(this.token.balanceOf(ZeroAddress, nft1), revertMessages.ZeroAddress);
          //   await expectRevert(this.token.balanceOf(ZeroAddress, nft1), revertMessage);
        });

        it('reverts with a Non-Fungible Collection id', async function () {
          await expectRevert(this.token.balanceOf(ZeroAddress, nfCollection), revertMessages.ZeroAddress);
        });

        it('reverts with a Fungible Token id', async function () {
          await expectRevert(this.token.balanceOf(ZeroAddress, fCollection1.id), revertMessages.ZeroAddress);
        });
      });
    });

    describe('balanceOfBatch', function () {
      it('reverts with inconsistent arrays', async function () {
        await expectRevert(this.token.balanceOfBatch([owner], [nft1, nft2]), revertMessages.InconsistentArrays);
      });

      it('reverts when queried about the zero address', async function () {
        await expectRevert(this.token.balanceOfBatch([ZeroAddress], [nft1]), revertMessages.ZeroAddress);
      });

      context('when the given addresses own some tokens', function () {
        it('returns the amounts of tokens owned by the given addresses, case 1', async function () {
          let owners = [owner, owner, owner, owner, owner];
          let ids = [nft1, nft2, nftOtherCollection, fCollection1.id, fCollection2.id];
          const balances = await this.token.balanceOfBatch(owners, ids);
          balances.map((t) => t.toNumber()).should.have.members([1, 1, 1, fCollection1.supply, fCollection2.supply]);
        });

        it('returns the amounts of tokens owned by the given addresses, case 2', async function () {
          let owners = [owner, owner, owner, owner];
          let ids = [nft1, nfCollection, fCollection1.id, fCollection2.id];
          const balances = await this.token.balanceOfBatch(owners, ids);
          balances.map((t) => t.toNumber()).should.have.members([1, 2, fCollection1.supply, fCollection2.supply]);
        });

        it('returns the amounts of tokens owned by the given addresses, case 3', async function () {
          let owners = [owner, owner, owner, owner];
          let ids = [nfCollection, nfCollectionOther, fCollection1.id, fCollection2.id];
          const balances = await this.token.balanceOfBatch(owners, ids);
          balances.map((t) => t.toNumber()).should.have.members([2, 1, fCollection1.supply, fCollection2.supply]);
        });

        it('returns the amounts of tokens owned by the given addresses, case 4', async function () {
          let owners = [owner, owner, owner];
          let ids = [nft1, nft2, nftOtherCollection];
          const balances = await this.token.balanceOfBatch(owners, ids);
          balances.map((t) => t.toNumber()).should.have.members([1, 1, 1]);
        });

        it('returns the amounts of tokens owned by the given addresses, case 5', async function () {
          let owners = [owner, owner];
          let ids = [fCollection1.id, fCollection2.id];
          const balances = await this.token.balanceOfBatch(owners, ids);
          balances.map((t) => t.toNumber()).should.have.members([fCollection1.supply, fCollection2.supply]);
        });
      });

      context('when the given address does not own any tokens', function () {
        it('returns 0 for a Non-Fungible Token id', async function () {
          const balances = await this.token.balanceOfBatch([other], [nft1]);
          balances.map((t) => t.toNumber()).should.have.members([0]);
        });

        it('returns 0 for a Non-Fungible Collection id', async function () {
          const balances = await this.token.balanceOfBatch([other], [nfCollection]);
          balances.map((t) => t.toNumber()).should.have.members([0]);
        });

        it('returns 0 for a Fungible Token id', async function () {
          const balances = await this.token.balanceOfBatch([other], [fCollection1.id]);
          balances.map((t) => t.toNumber()).should.have.members([0]);
        });
      });

      context('when querying the zero address', function () {
        it('reverts for a Non-Fungible Token id', async function () {
          await expectRevert(this.token.balanceOfBatch([ZeroAddress], [nft1]), revertMessages.ZeroAddress);
        });

        it('reverts for a Non-Fungible Collection id', async function () {
          await expectRevert(this.token.balanceOfBatch([ZeroAddress], [nfCollection]), revertMessages.ZeroAddress);
        });

        it('reverts for a Fungible Token id', async function () {
          await expectRevert(this.token.balanceOfBatch([ZeroAddress], [fCollection1.id]), revertMessages.ZeroAddress);
        });
      });
    });

    describe('setApprovalForAll', function () {
      let receipt;
      beforeEach(async function () {
        receipt = await this.token.setApprovalForAll(other, true, {from: owner});
      });

      it('sets approval status which can be queried via isApprovedForAll', async function () {
        expect(await this.token.isApprovedForAll(owner, other)).to.be.equal(true);
      });

      it('emits an ApprovalForAll event', function () {
        expectEventWithParamsOverride(receipt, 'ApprovalForAll', {_owner: owner, _operator: other, _approved: true}, eventParamsOverrides);
      });

      it('can unset approval for an operator', async function () {
        await this.token.setApprovalForAll(other, false, {from: owner});
        expect(await this.token.isApprovedForAll(owner, other)).to.be.equal(false);
      });

      it('reverts if attempting to approve self as an operator', async function () {
        await expectRevert(this.token.setApprovalForAll(owner, true, {from: owner}), revertMessages.SelfApprovalForAll);
      });
    });

    describe('transfer', function () {
      let receipt = null;

      const transferWasSuccessful = function (tokenIds, values, data, options, receiverType, selfTransfer) {
        const ids = Array.isArray(tokenIds) ? tokenIds : [tokenIds];
        const vals = Array.isArray(values) ? values : [values];
        const tokens = ids.map((id, i) => [id, vals[i]]);
        const fungibleTokens = tokens.filter(([id, _value]) => isFungible(id));
        const nonFungibleTokens = tokens.filter(([id, _value]) => isNonFungibleToken(id, nfMaskLength));

        if (tokens.length != 0) {
          if (selfTransfer) {
            it('does not affect the sender balance(s)', async function () {
              for (const [id, _value] of tokens) {
                let balance;
                if (isNonFungibleToken(id, nfMaskLength)) {
                  balance = '1';
                } else {
                  if (id == fCollection1.id) {
                    balance = fCollection1.supply;
                  } else if (id == fCollection2.id) {
                    balance = fCollection2.supply;
                  } else if (id == fCollection3.id) {
                    balance = fCollection3.supply;
                  }
                }
                (await this.token.balanceOf(owner, id)).should.be.bignumber.equal(new BN(balance));
              }
            });
          } else {
            it('decreases the sender balance(s)', async function () {
              for (const [id, value] of tokens) {
                let balance;
                if (isNonFungibleToken(id, nfMaskLength)) {
                  balance = '0';
                } else {
                  let initialBalance;
                  if (id == fCollection1.id) {
                    initialBalance = fCollection1.supply;
                  } else if (id == fCollection2.id) {
                    initialBalance = fCollection2.supply;
                  } else if (id == fCollection3.id) {
                    initialBalance = fCollection3.supply;
                  }
                  balance = initialBalance - value;
                }
                (await this.token.balanceOf(owner, id)).should.be.bignumber.equal(new BN(balance));
              }
            });

            it('increases the recipient balance(s)', async function () {
              for (const [id, value] of tokens) {
                (await this.token.balanceOf(this.toWhom, id)).should.be.bignumber.equal(new BN(value));
              }
            });
          }

          if (interfaces.ERC1155Inventory) {
            it('[ERC1155Inventory] does not affect the token(s) total supply', async function () {
              for (const [id, _value] of tokens) {
                let supply;
                if (isNonFungibleToken(id, nfMaskLength)) {
                  supply = '1';
                } else {
                  if (id == fCollection1.id) {
                    supply = fCollection1.supply;
                  } else if (id == fCollection2.id) {
                    supply = fCollection2.supply;
                  } else if (id == fCollection3.id) {
                    supply = fCollection3.supply;
                  }
                }
                (await this.token.totalSupply(id)).should.be.bignumber.equal(new BN(supply));
              }
            });
          }

          if (nonFungibleTokens.length != 0) {
            if (interfaces.ERC721 || interfaces.ERC1155Inventory) {
              if (selfTransfer) {
                it('[ERC721/ERC1155inventory] does not affect the Non-Fungible Token(s) ownership', async function () {
                  for (const [id, _value] of nonFungibleTokens) {
                    (await this.token.ownerOf(id)).should.be.equal(owner);
                  }
                });
              } else {
                it('[ERC721/ERC1155inventory] gives the ownership of the Non-Fungible Token(s) to the recipient', async function () {
                  for (const [id, _value] of nonFungibleTokens) {
                    (await this.token.ownerOf(id)).should.be.equal(this.toWhom);
                  }
                });
              }
            }

            if (interfaces.ERC1155Inventory) {
              if (selfTransfer) {
                it('[ERC1155Inventory] does not affect the sender Non-Fungible Collection balance(s)', async function () {
                  (await this.token.balanceOf(owner, nfCollection)).should.be.bignumber.equal(this.nfcBalance);
                  (await this.token.balanceOf(owner, nfCollectionOther)).should.be.bignumber.equal(this.otherNFCBalance);
                });
              } else {
                const nbCollectionNFTs = ids.filter((id) => id == nft1 || id == nft2).length;
                const nbOtherCollectionNFTs = ids.filter((id) => id == nftOtherCollection).length;

                it('[ERC1155Inventory] decreases the sender Non-Fungible Collection balance(s)', async function () {
                  (await this.token.balanceOf(owner, nfCollection)).should.be.bignumber.equal(this.nfcBalance.subn(nbCollectionNFTs));
                  (await this.token.balanceOf(owner, nfCollectionOther)).should.be.bignumber.equal(this.otherNFCBalance.subn(nbOtherCollectionNFTs));
                });

                it('[ERC1155Inventory] increases the recipient Non-Fungible Collection balance(s)', async function () {
                  (await this.token.balanceOf(this.toWhom, nfCollection)).should.be.bignumber.equal(new BN(nbCollectionNFTs));
                  (await this.token.balanceOf(this.toWhom, nfCollectionOther)).should.be.bignumber.equal(new BN(nbOtherCollectionNFTs));
                });
              }

              it('[ERC1155Inventory] does not affect the Non-Fungible Collection(s) total supply', async function () {
                (await this.token.totalSupply(nfCollection)).should.be.bignumber.equal(this.nfcSupply);
                (await this.token.totalSupply(nfCollectionOther)).should.be.bignumber.equal(this.otherNFCSupply);
              });
            }

            if (interfaces.ERC721) {
              if (selfTransfer) {
                it('[ERC721] does not affect the sender NFTs balance', async function () {
                  (await this.token.balanceOf(owner)).should.be.bignumber.equal(this.nftBalance);
                });
              } else {
                it('[ERC721] decreases sender NFTs balance', async function () {
                  (await this.token.balanceOf(owner)).should.be.bignumber.equal(this.nftBalance.subn(nonFungibleTokens.length));
                });

                it('[ERC721] increases recipient NFTs balance', async function () {
                  (await this.token.balanceOf(this.toWhom)).should.be.bignumber.equal(new BN(nonFungibleTokens.length));
                });
              }

              it('[ERC721] clears the Non-Fungible Token(s) approval', async function () {
                for (const [id, _value] of nonFungibleTokens) {
                  (await this.token.getApproved(id)).should.be.equal(ZeroAddress);
                }
              });

              it('[ERC721] emits Transfer event(s) for the Non-Fungible Token(s)', function () {
                for (const [id, _value] of nonFungibleTokens) {
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
            }
          }

          if (interfaces.ERC1155Inventory && fungibleTokens.length != 0) {
            it('[ERC1155inventory] does not give the ownership for Fungible Token(s)', async function () {
              for (const [id, _value] of fungibleTokens) {
                await expectRevert(this.token.ownerOf(id), revertMessages.NonExistingNFT);
              }
            });
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
                _from: owner,
                _to: this.toWhom,
                _id: tokenIds,
                _value: values,
              },
              eventParamsOverrides
            );
          });
        }

        if (receiverType == ReceiverType.ERC1155_RECEIVER) {
          if (Array.isArray(tokenIds)) {
            it('[ERC1155] should call onERC1155BatchReceived', async function () {
              await expectEvent.inTransaction(receipt.tx, ERC1155TokenReceiverMock, 'ReceivedBatch', {
                operator: options.from,
                from: owner,
                ids: tokenIds,
                values: values,
                data: data,
              });
            });
          } else {
            it('[ERC1155] should call onERC1155Received', async function () {
              await expectEvent.inTransaction(receipt.tx, ERC1155TokenReceiverMock, 'ReceivedSingle', {
                operator: options.from,
                from: owner,
                id: tokenIds,
                value: values,
                data: data,
              });
            });
          }
        }
      };

      const shouldTransferTokenBySender = function (transferFunction, tokenIds, values, data, receiverType, selfTransfer = false) {
        context('when called by the owner', function () {
          const options = {from: owner};
          beforeEach(async function () {
            receipt = await transferFunction.call(this, owner, this.toWhom, tokenIds, values, data, options);
          });
          transferWasSuccessful(tokenIds, values, data, options, receiverType, selfTransfer);
        });

        if (interfaces.Pausable) {
          context('[Pausable] when called after unpausing', function () {
            const options = {from: owner};
            beforeEach(async function () {
              await this.token.pause({from: deployer});
              await this.token.unpause({from: deployer});
              receipt = await transferFunction.call(this, owner, this.toWhom, tokenIds, values, data, options);
            });
            transferWasSuccessful(tokenIds, values, data, options, receiverType, selfTransfer);
          });
        }

        context('when called by an operator', function () {
          const options = {from: operator};
          beforeEach(async function () {
            receipt = await transferFunction.call(this, owner, this.toWhom, tokenIds, values, data, options);
          });
          transferWasSuccessful(tokenIds, values, data, options, receiverType, selfTransfer);
        });

        const ids = Array.isArray(tokenIds) ? tokenIds : [tokenIds];
        const approvedTokenIds = ids.filter((id) => id == nft1 || id == nft2);
        if (interfaces.ERC721 && ids.length != 0 && ids.length == approvedTokenIds.length) {
          context('[ERC721] when called by a wallet with single token approval', function () {
            const options = {from: approved};
            beforeEach(async function () {
              receipt = await transferFunction.call(this, owner, this.toWhom, tokenIds, values, data, options);
            });
            transferWasSuccessful(tokenIds, values, data, options, receiverType, selfTransfer);
          });
        }
      };

      const shouldRevertOnPreconditions = function (transferFunction) {
        describe('Pre-conditions', function () {
          const data = '0x42';
          if (interfaces.Pausable) {
            it('[Pausable] reverts when paused', async function () {
              await this.token.pause({from: deployer});
              await expectRevert(transferFunction.call(this, owner, other, nft1, 1, data, {from: owner}), revertMessages.Paused);
            });
          }
          it('reverts if transferred to the zero address', async function () {
            await expectRevert(transferFunction.call(this, owner, ZeroAddress, nft1, 1, data, {from: owner}), revertMessages.TransferToZero);
          });

          it('reverts if the sender is not approved', async function () {
            await expectRevert(transferFunction.call(this, owner, other, nft1, 1, data, {from: other}), revertMessages.NonApproved);
            await expectRevert(transferFunction.call(this, owner, other, fCollection1.id, 1, data, {from: other}), revertMessages.NonApproved);
          });

          it('reverts if a Fungible Token has a value equal 0', async function () {
            await expectRevert(transferFunction.call(this, owner, other, fCollection1.id, 0, data, {from: owner}), revertMessages.ZeroValue);
          });

          it('reverts if a Non-Fungible Token has a value different from 1', async function () {
            await expectRevert(transferFunction.call(this, owner, other, nft1, 0, data, {from: owner}), revertMessages.WrongNFTValue);
            await expectRevert(transferFunction.call(this, owner, other, nft1, 2, data, {from: owner}), revertMessages.WrongNFTValue);
          });

          it('reverts with a non-existing Non-Fungible Token', async function () {
            await expectRevert(transferFunction.call(this, owner, other, unknownNft, 1, data, {from: owner}), revertMessages.NonOwnedNFT);
          });

          it('reverts if from is not the owner for a Non-Fungible Token', async function () {
            await expectRevert(transferFunction.call(this, other, approved, nft1, 1, data, {from: other}), revertMessages.NonOwnedNFT);
          });

          it('reverts if from has insufficient balance for a Fungible Token', async function () {
            await expectRevert(
              transferFunction.call(this, other, approved, fCollection1.id, 1, data, {from: other}),
              revertMessages.InsufficientBalance
            );
          });

          if (interfaces.ERC721) {
            it('[ERC721] reverts if the sender is not authorized for the token', async function () {
              await expectRevert(transferFunction.call(this, owner, other, nft1, 1, data, {from: other}), revertMessages.NonApproved);
            });
          }

          if (interfaces.ERC1155Inventory) {
            it('[ERC1155Inventory] reverts if the id is a Non-Fungible Collection', async function () {
              await expectRevert(transferFunction.call(this, owner, owner, nfCollection, 1, data, {from: owner}), revertMessages.NotToken);
            });
          }

          it('reverts when sent to a non-receiver contract', async function () {
            await expectRevert.unspecified(transferFunction.call(this, owner, this.token.address, nft1, 1, data, {from: owner}));
          });
          it('reverts when sent to an ERC721Receiver', async function () {
            await expectRevert.unspecified(transferFunction.call(this, owner, this.receiver721.address, nft1, 1, data, {from: owner}));
          });
          it('reverts when sent to an ERC1155TokenReceiver which refuses the transfer', async function () {
            await expectRevert(
              transferFunction.call(this, owner, this.refusingReceiver1155.address, nft1, 1, data, {from: owner}),
              revertMessages.TransferRejected
            );
          });
        });
      };

      const shouldTransferTokenToRecipient = function (transferFunction, ids, values, data) {
        context('when sent to another wallet', function () {
          beforeEach(async function () {
            this.toWhom = other;
          });
          shouldTransferTokenBySender(transferFunction, ids, values, data, ReceiverType.WALLET);
        });

        context('when sent to the same owner', function () {
          beforeEach(async function () {
            this.toWhom = owner;
          });
          const selfTransfer = true;
          shouldTransferTokenBySender(transferFunction, ids, values, data, ReceiverType.WALLET, selfTransfer);
        });

        context('when sent to an ERC1155TokenReceiver contract', function () {
          beforeEach(async function () {
            this.toWhom = this.receiver1155.address;
          });
          shouldTransferTokenBySender(transferFunction, ids, values, data, ReceiverType.ERC1155_RECEIVER);
        });
      };

      describe('safeTransferFrom(address,address,uint256,uint256,bytes)', function () {
        const transferFn = async function (from, to, id, value, data, options) {
          return this.token.methods['safeTransferFrom(address,address,uint256,uint256,bytes)'](from, to, id, value, data, options);
        };

        shouldRevertOnPreconditions(transferFn);
        context('with a Fungible Token', function () {
          context('partial balance transfer', function () {
            shouldTransferTokenToRecipient(transferFn, fCollection1.id, 1, '0x42');
          });
          context('full balance transfer', function () {
            shouldTransferTokenToRecipient(transferFn, fCollection1.id, fCollection1.supply, '0x42');
          });
        });
        context('with a Non-Fungible Token', function () {
          shouldTransferTokenToRecipient(transferFn, nft1, 1, '0x42');
        });
      });

      describe('safeBatchTransferFrom(address,address,uint256[],uint256[],bytes)', function () {
        const transferFn = async function (from, to, ids, values, data, options) {
          const tokenIds = Array.isArray(ids) ? ids : [ids];
          const vals = Array.isArray(values) ? values : [values];
          return this.token.methods['safeBatchTransferFrom(address,address,uint256[],uint256[],bytes)'](from, to, tokenIds, vals, data, options);
        };
        shouldRevertOnPreconditions(transferFn);

        it('reverts with inconsistent arrays', async function () {
          await expectRevert(transferFn.call(this, owner, other, [nft1, nft2], [1], '0x42', {from: owner}), revertMessages.InconsistentArrays);
        });
        context('with an empty list of tokens', function () {
          shouldTransferTokenToRecipient(transferFn, [], [], '0x42');
        });
        context('with Fungible Tokens', function () {
          context('single partial balance transfer', function () {
            shouldTransferTokenToRecipient(transferFn, [fCollection1.id], [1], '0x42');
          });
          context('single full balance transfer', function () {
            shouldTransferTokenToRecipient(transferFn, [fCollection1.id], [fCollection1.supply], '0x42');
          });
          context('multiple tokens transfer', function () {
            shouldTransferTokenToRecipient(
              transferFn,
              [fCollection1.id, fCollection2.id, fCollection3.id],
              [fCollection1.supply, 1, fCollection3.supply],
              '0x42'
            );
          });
        });
        context('with Non-Fungible Tokens', function () {
          context('single token transfer', function () {
            shouldTransferTokenToRecipient(transferFn, [nft1], [1], '0x42');
          });
          context('multiple tokens from the same collection transfer', function () {
            shouldTransferTokenToRecipient(transferFn, [nft1, nft2], [1, 1], '0x42');
          });
          context('multiple tokens sorted by collection transfer', function () {
            shouldTransferTokenToRecipient(transferFn, [nft1, nft2, nftOtherCollection], [1, 1, 1], '0x42');
          });
          if (interfaces.ERC1155Inventory) {
            context('[ERC1155Inventory] multiple tokens not sorted by collection transfer', function () {
              shouldTransferTokenToRecipient(transferFn, [nft1, nftOtherCollection, nft2], [1, 1, 1], '0x42');
            });
          }
        });
        context('with Fungible and Non-Fungible Tokens', function () {
          context('multiple tokens sorted by Non-Fungible Collection transfer', function () {
            shouldTransferTokenToRecipient(
              transferFn,
              [fCollection1.id, nft1, fCollection2.id, nft2, nftOtherCollection],
              [2, 1, fCollection2.supply, 1, 1],
              '0x42'
            );
          });
          if (interfaces.ERC1155Inventory) {
            context('multiple tokens not sorted by Non-Fungible Collection transfer', function () {
              shouldTransferTokenToRecipient(
                transferFn,
                [fCollection1.id, nft1, fCollection2.id, nftOtherCollection, nft2],
                [2, 1, fCollection2.supply, 1, 1],
                '0x42'
              );
            });
          }
        });
      });
    });

    behaviors.shouldSupportInterfaces([interfaces165.ERC165, interfaces1155.ERC1155]);
  });
}

module.exports = {
  shouldBehaveLikeERC1155Standard,
};

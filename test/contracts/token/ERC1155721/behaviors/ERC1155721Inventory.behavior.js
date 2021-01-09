const { contract } = require('@openzeppelin/test-environment');
const { BN, expectEvent, expectRevert } = require('@openzeppelin/test-helpers');

const { constants } = require('@animoca/ethereum-contracts-core_library');
const { ZeroAddress, EmptyByte } = constants;

const { makeFungibleCollectionId, makeNonFungibleCollectionId, makeNonFungibleTokenId } = require('@animoca/blockchain-inventory_metadata').inventoryIds;

const ReceiverMock = contract.fromArtifact('ERC1155721ReceiverMock');
const ReceiverMock721 = contract.fromArtifact('ERC721ReceiverMock');

function shouldBehaveLikeERC1155721Inventory(
  {nfMaskLength, mint, transferFrom_ERC721, safeTransferFrom_ERC721, batchTransferFrom_ERC721, safeTransferFrom, safeBatchTransferFrom, revertMessages},
  [creator, owner, approved, operator, other]
) {

  const fCollection1 = {
    id: makeFungibleCollectionId(1),
    supply: 10
  };
  const fCollection2 = {
    id: makeFungibleCollectionId(2),
    supply: 11
  };
  const fCollection3 = {
    id: makeFungibleCollectionId(2),
    supply: 12
  };

  const nfCollection = makeNonFungibleCollectionId(1, nfMaskLength);
  const nfCollection2 = makeNonFungibleCollectionId(2, nfMaskLength);


  const nft1 = makeNonFungibleTokenId(1, 1, nfMaskLength);
  const nft2 = makeNonFungibleTokenId(1, 2, nfMaskLength);
  const nft3 = makeNonFungibleTokenId(2, 2, nfMaskLength);

  describe('like an ERC1155721Inventory', function () {
    beforeEach(async function () {

      await mint(this.token, owner, fCollection1.id, fCollection1.supply, '0x', { from: creator });
      await mint(this.token, owner, fCollection2.id, fCollection2.supply, '0x', { from: creator });
      await mint(this.token, owner, fCollection3.id, fCollection3.supply, '0x', { from: creator });
      await mint(this.token, owner, nft1, 1, '0x', { from: creator });
      await mint(this.token, owner, nft2, 1, '0x', { from: creator });
      await mint(this.token, owner, nft3, 1, '0x', { from: creator });

      this.receiver = await ReceiverMock.new(true, true);
      this.receiver721 = await ReceiverMock721.new(true);

      this.toWhom = other; // default to anyone for toWhom in context-dependent tests
    });

    const data = '0x42';

    describe('721 events during 1155 functions', function () {
      describe('safeTransferFrom', function () {
        it('does not emit a Transfer event for a fungible transfer', async function () {
          const receipt = await this.token.methods['safeTransferFrom(address,address,uint256,uint256,bytes)'](owner, other, fCollection1.id, new BN(1), data, { from: owner });

          let present = false;
          try {
            expectEvent(receipt, 'Transfer', {
              _from: owner,
              _to: other
            });
            present = true;
          } catch (e) { }

          present.should.be.false;
        });

        it('emits a Transfer event for a non-fungible transfer', async function () {
          const receipt = await this.token.methods['safeTransferFrom(address,address,uint256,uint256,bytes)'](owner, other, nft1, new BN(1), data, { from: owner });
          expectEvent(receipt, 'Transfer', {
            _from: owner,
            _to: other,
            _tokenId: nft1
          });
        });
      });

      describe('safeBatchTransferFrom', function () {
        it('emits Transfer events for non fungible transfers', async function () {
          const ids = [nft1, fCollection1.id, nft2];
          const values = [new BN(1), new BN(1), new BN(1)];
          const receipt = await this.token.methods['safeBatchTransferFrom(address,address,uint256[],uint256[],bytes)'](owner, other, ids, values, data, { from: owner });

          expectEvent(receipt, 'Transfer', {
            _from: owner,
            _to: other,
            _tokenId: nft1
          });

          expectEvent(receipt, 'Transfer', {
            _from: owner,
            _to: other,
            _tokenId: nft2
          });
        });
      });
    });

    describe('721 functions on non-NFT ids', function () {
      beforeEach(async function () {
        await mint(this.token, owner, fCollection1.id, fCollection1.supply, '0x', { from: creator });
        await mint(this.token, owner, fCollection2.id, fCollection2.supply, '0x', { from: creator });
        this.toWhom = other; // default to anyone for toWhom in context-dependent tests
      });

      // describe('balanceOf', function () {
      //   context('when the given address owns some fungible tokens', function () {
      //     it('returns 3', async function () {
      //       (await this.token.balanceOf(owner)).should.be.bignumber.equal('3');
      //     });
      //   });

      //   context('when the given address does not own any tokens', function () {
      //     it('returns 0', async function () {
      //       (await this.token.balanceOf(other)).should.be.bignumber.equal('0');
      //     });
      //   });

      //   context('when querying the zero address', function () {
      //     it('throws', async function () {
      //       await expectRevert.unspecified(this.token.balanceOf(ZeroAddress));
      //     });
      //   });
      // });

      describe('ownerOf', function () {
        context('applied on a fungible token id', function () {
          it('reverts', async function () {
            await expectRevert.unspecified(this.token.ownerOf(fCollection1.id));
          });
        });

        context('applied on a non-fungible collection id', function () {
          it('reverts', async function () {
            await expectRevert.unspecified(this.token.ownerOf(nfCollection));
          });
        });
      });

      describe('transfers', function () {
        const data = '0x42';

        beforeEach(async function () {
          await this.token.setApprovalForAll(operator, true, { from: owner });
        });

        const shouldNotTransferTokensByUsers = function (transferFunction, collectionId) {
          context('when called by the owner', function () {
            it('reverts', async function () {
              await expectRevert.unspecified(transferFunction.call(this, owner, this.toWhom, collectionId, { from: owner }));
            });
          });

          context('when called by the operator', function () {
            it('reverts', async function () {
              await expectRevert.unspecified(transferFunction.call(this, owner, this.toWhom, collectionId, { from: operator }));
            });
          });

          context('when sent to the owner', function () {
            it('reverts', async function () {
              await expectRevert.unspecified(transferFunction.call(this, owner, owner, collectionId, { from: owner }));
            });
          });

          context('when the address of the previous owner is incorrect', function () {
            it('reverts', async function () {
              await expectRevert.unspecified(transferFunction.call(this, owner, other, collectionId, { from: owner })
              );
            });
          });

          context('when the sender is not authorized for the token id', function () {
            it('reverts', async function () {
              await expectRevert.unspecified(transferFunction.call(this, owner, other, collectionId, { from: other })
              );
            });
          });

          context('when the given token ID does not exist', function () {
            it('reverts', async function () {
              await expectRevert.unspecified(transferFunction.call(this, owner, other, fCollection3.id, { from: owner })
              );
            });
          });

          context('when the address to transfer the token to is the zero address', function () {
            it('reverts', async function () {
              await expectRevert.unspecified(
                transferFunction.call(this, owner, ZeroAddress, collectionId, { from: owner })
              );
            });
          });
        };

        describe('via transferFrom', function () {
          shouldNotTransferTokensByUsers(function (from, to, tokenId, opts) {
            return this.token.transferFrom(from, to, tokenId, opts);
          }, fCollection1.id);
        });

        describe('via safeTransferFrom', function () {
          const safeTransferFromWithData = function (from, to, tokenId, opts) {
            return this.token.methods['safeTransferFrom(address,address,uint256,bytes)'](from, to, tokenId, data, opts);
          };

          const safeTransferFromWithoutData = function (from, to, tokenId, opts) {
            return this.token.methods['safeTransferFrom(address,address,uint256)'](from, to, tokenId, opts);
          };

          const shouldNotTransferSafely = function (transferFun, data) {
            describe('to a user account', function () {
              shouldNotTransferTokensByUsers(transferFun, fCollection1.id);
            });

            describe('to a valid receiver contract', function () {
              beforeEach(async function () {
                this.receiver = await ReceiverMock.new(true, true);
                this.toWhom = this.receiver.address;
              });

              shouldNotTransferTokensByUsers(transferFun, fCollection1.id);

              describe('with an invalid token id', function () {
                it('reverts', async function () {
                  await expectRevert.unspecified(
                    transferFun.call(
                      this,
                      owner,
                      this.receiver.address,
                      fCollection3.id,
                      { from: owner },
                    )
                  );
                });
              });
            });
          };

          describe('with data', function () {
            shouldNotTransferSafely(safeTransferFromWithData, data);
          });

          describe('without data', function () {
            shouldNotTransferSafely(safeTransferFromWithoutData, null);
          });

          describe('to a receiver contract returning unexpected value', function () {
            it('reverts', async function () {
              const invalidReceiver = await ReceiverMock.new(false, false);
              await expectRevert.unspecified(
                this.token.contract.methods.safeTransferFrom(owner, invalidReceiver.address, fCollection1.id.toString(10)).send({ from: owner, gas: 4000000 })
              );
            });
          });

          describe('to a contract that does not implement the required function', function () {
            it('reverts', async function () {
              const invalidReceiver = this.token;
              await expectRevert.unspecified(
                this.token.contract.methods.safeTransferFrom(owner, invalidReceiver.address, fCollection1.id.toString(10)).send({ from: owner, gas: 4000000 })
              );
            });
          });
        });
      });

      describe('approve', function () {
        const tokenId = fCollection1.id;

        context('when approving a non-zero address', function () {
          it('reverts', async function () {
            await expectRevert.unspecified(this.token.approve(approved, tokenId, { from: owner }));
          });
        });

        context('when the address that receives the approval is the owner', function () {
          it('reverts', async function () {
            await expectRevert.unspecified(
              this.token.approve(owner, tokenId, { from: owner })
            );
          });
        });

        context('when the sender does not own the given token ID', function () {
          it('reverts', async function () {
            await expectRevert.unspecified(this.token.approve(approved, tokenId, { from: other }));
          });
        });

        context('when the sender is an operator', function () {
          it('reverts', async function () {
            await this.token.setApprovalForAll(operator, true, { from: owner });
            await expectRevert.unspecified(this.token.approve(approved, tokenId, { from: operator }));
          });
        });

        context('when the given token ID does not exist', function () {
          it('reverts', async function () {
            await expectRevert.unspecified(this.token.approve(approved, fCollection3.id, { from: owner }));
          });
        });
      });
    });

    describe('721 transfer functions', function () {
      context('transferFrom', function () {
        it('should revert if `to` is the zero address', async function () {
          await expectRevert(
            transferFrom_ERC721(this.token, owner, ZeroAddress, nft1, {from: owner}),
            revertMessages.TransferToZero
          );
        });

        it('should revert if the sender is not approved', async function () {
          await expectRevert(
            transferFrom_ERC721(this.token, owner, other, nft1, {from: other}),
            revertMessages.NonApproved
          );
        });

        it('should revert if `nftId` is a fungible collection', async function () {
          await expectRevert(
            transferFrom_ERC721(this.token, owner, other, fCollection1.id, {from: owner}),
            revertMessages.NotNFT
          );
        });

        it('should revert if `nftId` is a non-fungible collection', async function () {
          await expectRevert(
            transferFrom_ERC721(this.token, owner, other, nfCollection, {from: owner}),
            revertMessages.NotNFT
          );
        });

        it('should revert if `nftId` is not owned by `from`', async function () {
          await expectRevert(
            transferFrom_ERC721(this.token, other, owner, nft1, {from: owner}),
            revertMessages.NonOwnedNFT
          );
        });

        context('when successful', function () {
          const transferFrom = function (from) {
            beforeEach(async function () {
              this.nftBalanceOwner = await this.token.balanceOf(owner, nft1);
              this.nftBalanceToWhom = await this.token.balanceOf(this.toWhom, nft1);
              this.balanceOwner = await this.token.balanceOf(owner, nfCollection);
              this.balanceToWhom = await this.token.balanceOf(this.toWhom, nfCollection);
              this.receipt = await transferFrom_ERC721(this.token, owner, this.toWhom, nft1, {from: from});
            });
  
            it('should transfer the token to the new owner', async function () {
              const newOwner = await this.token.ownerOf(nft1);
              newOwner.should.not.equal(owner);
              newOwner.should.equal(this.toWhom);
            });
  
            it('should increase the non-fungible token balance of the new owner', async function () {
              (await this.token.balanceOf(this.toWhom, nft1)).should.be.bignumber.equal(this.nftBalanceToWhom.addn(1));
            });
  
            it('should decrease the non-fungible token balance of the previous owner', async function () {
              (await this.token.balanceOf(owner, nft1)).should.be.bignumber.equal(this.nftBalanceOwner.subn(1));
            });
  
            it('should increase the non-fungible collection balance of the new owner', async function () {
              (await this.token.balanceOf(this.toWhom, nfCollection)).should.be.bignumber.equal(this.balanceToWhom.addn(1));
            });
  
            it('should decrease the non-fungible collection balance of the previous owner', async function () {
              (await this.token.balanceOf(owner, nfCollection)).should.be.bignumber.equal(this.balanceOwner.subn(1));
            });
  
            it('should emit the Transfer event', async function () {
              expectEvent(
                this.receipt,
                'Transfer',
                {
                  _from: owner,
                  _to: this.toWhom,
                  _tokenId: nft1
                }
              );
            });
  
            it('should emit the TransferSingle event', async function () {
              expectEvent(
                this.receipt,
                'TransferSingle',
                {
                  _operator: from,
                  _from: owner,
                  _to: this.toWhom,
                  _id: nft1,
                  _value: '1',
                }
              );
            });
          };

          context('transferred to a user account', function () {
              beforeEach(async function () {
                  this.toWhom = other;
              });

            context('when called by the owner', function () {
              transferFrom(owner);
          });

            context('when called by an operator', function () {
              beforeEach(async function () {
                await this.token.setApprovalForAll(operator, true, { from: owner });
              });

              transferFrom(operator);
            });

            context('when called by an approved sender', function () {
              beforeEach(async function () {
                await this.token.approve(approved, nft1, { from: owner });
              });

              transferFrom(approved);
            });
          });

          context('transferred to an ERC-1155 receiver contract', function () {
            beforeEach(async function () {
              this.toWhom = this.receiver.address;
            })

            const transferFromToReceiver = function (from) {
              transferFrom(from);

            it('should safely receive', async function () {
              await expectEvent.inTransaction(
                this.receipt.tx,
                this.receiver,
                'ReceivedSingle',
                {
                    operator: from,
                  from: owner,
                  id: nft1,
                  value: 1,
                  data: null,
                }
              );
            });
            };

            context('when called by the owner', function () {
              transferFromToReceiver(owner);
          });

            context('when called by an operator', function () {
              beforeEach(async function () {
                await this.token.setApprovalForAll(operator, true, { from: owner });
              });

              transferFromToReceiver(operator);
            });

            context('when called by an approved sender', function () {
              beforeEach(async function () {
                await this.token.approve(approved, nft1, { from: owner });
              });

              transferFrom(approved);
            });
          });

          context('transferred to an ERC-721 receiver contract', function () {
            beforeEach(async function () {
              this.toWhom = this.receiver721.address;
            })

            const transferFromToReceiver = function (from) {
              transferFrom(from);

            it('should NOT safely receive', async function () {
              await expectEvent.notEmitted.inTransaction(
                this.receipt.tx,
                this.receiver721,
                'Received'
              );
            });
            };

            context('when called by the owner', function () {
              transferFromToReceiver(owner);
          });

            context('when called by an operator', function () {
              beforeEach(async function () {
                await this.token.setApprovalForAll(operator, true, { from: owner });
        });

              transferFromToReceiver(operator);
      });

            context('when called by an approved sender', function () {
              beforeEach(async function () {
                await this.token.approve(approved, nft1, { from: owner });
              });

              transferFrom(approved);
            });
          });
        });
      });

      context('safeTransferFrom', function () {
        it('should revert if `to` is the zero address', async function () {
          await expectRevert(
            safeTransferFrom_ERC721(this.token, owner, ZeroAddress, nft1, data, {from: owner}),
            revertMessages.TransferToZero
          );
        });

        it('should revert if the sender is not approved', async function () {
          await expectRevert(
            safeTransferFrom_ERC721(this.token, owner, other, nft1, data, {from: other}),
            revertMessages.NonApproved
          );
        });

        it('should revert if `nftId` is a fungible collection', async function () {
          await expectRevert(
            safeTransferFrom_ERC721(this.token, owner, other, fCollection1.id, data, {from: owner}),
            revertMessages.NotNFT
          );
        });

        it('should revert if `nftId` is a non-fungible collection', async function () {
          await expectRevert(
            safeTransferFrom_ERC721(this.token, owner, other, nfCollection, data, {from: owner}),
            revertMessages.NotNFT
          );
        });

        it('should revert if `nftId` is not owned by `from`', async function () {
          await expectRevert(
            safeTransferFrom_ERC721(this.token, other, owner, nft1, data, {from: owner}),
            revertMessages.NonOwnedNFT
          );
        });

        context('when successful', function () {
          const transferFrom = function (from) {
            beforeEach(async function () {
              this.nftBalanceOwner = await this.token.balanceOf(owner, nft1);
              this.nftBalanceToWhom = await this.token.balanceOf(this.toWhom, nft1);
              this.balanceOwner = await this.token.balanceOf(owner, nfCollection);
              this.balanceToWhom = await this.token.balanceOf(this.toWhom, nfCollection);
              this.receipt = await safeTransferFrom_ERC721(this.token, owner, this.toWhom, nft1, data, {from: from});
            });
  
            it('should transfer the token to the new owner', async function () {
              const newOwner = await this.token.ownerOf(nft1);
              newOwner.should.not.equal(owner);
              newOwner.should.equal(this.toWhom);
            });
  
            it('should increase the non-fungible token balance of the new owner', async function () {
              (await this.token.balanceOf(this.toWhom, nft1)).should.be.bignumber.equal(this.nftBalanceToWhom.addn(1));
            });
  
            it('should decrease the non-fungible token balance of the previous owner', async function () {
              (await this.token.balanceOf(owner, nft1)).should.be.bignumber.equal(this.nftBalanceOwner.subn(1));
            });
  
            it('should increase the non-fungible collection balance of the new owner', async function () {
              (await this.token.balanceOf(this.toWhom, nfCollection)).should.be.bignumber.equal(this.balanceToWhom.addn(1));
            });
  
            it('should decrease the non-fungible collection balance of the previous owner', async function () {
              (await this.token.balanceOf(owner, nfCollection)).should.be.bignumber.equal(this.balanceOwner.subn(1));
            });
  
            it('should emit the Transfer event', async function () {
              expectEvent(
                this.receipt,
                'Transfer',
                {
                  _from: owner,
                  _to: this.toWhom,
                  _tokenId: nft1
                }
              );
            });
  
            it('should emit the TransferSingle event', async function () {
              expectEvent(
                this.receipt,
                'TransferSingle',
                {
                  _operator: from,
                  _from: owner,
                  _to: this.toWhom,
                  _id: nft1,
                  _value: '1',
                }
              );
            });
          };

          context('transferred to a user account', function () {
              beforeEach(async function () {
                  this.toWhom = other;
              });

            context('when called by the owner', function () {
              transferFrom(owner);
            });

            context('when called by an operator', function () {
              beforeEach(async function () {
                await this.token.setApprovalForAll(operator, true, { from: owner });
              });

              transferFrom(operator);
            });

            context('when called by an approved sender', function () {
              beforeEach(async function () {
                await this.token.approve(approved, nft1, { from: owner });
              });

              transferFrom(approved);
            });
          });

          context('transferred to an ERC-1155 receiver contract', function () {
            beforeEach(async function () {
              this.toWhom = this.receiver.address;
            })

            const transferFromToReceiver = function (from) {
              transferFrom(from);

            it('should safely receive', async function () {
              await expectEvent.inTransaction(
                this.receipt.tx,
                this.receiver,
                'ReceivedSingle',
                {
                    operator: from,
                  from: owner,
                  id: nft1,
                  value: 1,
                  data: data,
                }
              );
            });
            };

            context('when called by the owner', function () {
              transferFromToReceiver(owner);
            });

            context('when called by an operator', function () {
              beforeEach(async function () {
                await this.token.setApprovalForAll(operator, true, { from: owner });
              });

              transferFromToReceiver(operator);
            });

            context('when called by an approved sender', function () {
              beforeEach(async function () {
                await this.token.approve(approved, nft1, { from: owner });
              });

              transferFrom(approved);
            });
          });

          context('transferred to an ERC-721 receiver contract', function () {
            beforeEach(async function () {
              this.toWhom = this.receiver721.address;
            })

            const transferFromToReceiver = function (from) {
              transferFrom(from);

            it('should safely receive', async function () {
              await expectEvent.inTransaction(
                this.receipt.tx,
                this.receiver721,
                'Received',
                {
                    operator: from,
                  from: owner,
                  tokenId: nft1,
                  data: data,
                }
              );
            });
            };

            context('when called by the owner', function () {
              transferFromToReceiver(owner);
            });

            context('when called by an operator', function () {
              beforeEach(async function () {
                await this.token.setApprovalForAll(operator, true, { from: owner });
              });

              transferFromToReceiver(operator);
            });

            context('when called by an approved sender', function () {
              beforeEach(async function () {
                await this.token.approve(approved, nft1, { from: owner });
              });

              transferFrom(approved);
            });
          });
        });
      });

      context('batchTransferFrom', function () {
        it('should revert if `to` is the zero address', async function () {
          await expectRevert(
            batchTransferFrom_ERC721(this.token, owner, ZeroAddress, [nft1], {from: owner}),
            revertMessages.TransferToZero
          );
        });

        it('should revert if the sender is not approved', async function () {
          await expectRevert(
            batchTransferFrom_ERC721(this.token, owner, other, [nft1], {from: other}),
            revertMessages.NonApproved
          );
        });

        it('should revert if one of `nftId` is a fungible collection', async function () {
          await expectRevert(
            batchTransferFrom_ERC721(this.token, owner, other, [nft1, fCollection1.id], {from: owner}),
            revertMessages.NotNFT
          );
        });

        it('should revert if one of `nftId` is a non-fungible collection', async function () {
          await expectRevert(
            batchTransferFrom_ERC721(this.token, owner, other, [nft1, nfCollection], {from: owner}),
            revertMessages.NotNFT
          );
        });

        it('should revert if one of `nftId` is not owned by `from`', async function () {
          await expectRevert(
            batchTransferFrom_ERC721(this.token, other, owner, [nft1], {from: owner}),
            revertMessages.NonOwnedNFT
          );
        });

        context('when successful', function () {
          const collection1Nfts = [nft1];
          const collection2Nfts = [nft2, nft3];
          const nfts = collection1Nfts.concat(collection2Nfts);

          const transferFrom = function (from) {
            beforeEach(async function () {
              this.nftBalanceOwner = [];
              this.nftBalanceToWhom = [];
              for (const nft of nfts) {
                this.nftBalanceOwner.push(await this.token.balanceOf(owner, nft));
                this.nftBalanceToWhom.push(await this.token.balanceOf(this.toWhom, nft));
              }
              this.collection1BalanceOwner = await this.token.balanceOf(owner, nfCollection);
              this.collection1BalanceToWhom = await this.token.balanceOf(this.toWhom, nfCollection);
              this.collection2BalanceOwner = await this.token.balanceOf(owner, nfCollection2);
              this.collection2BalanceToWhom = await this.token.balanceOf(this.toWhom, nfCollection2);
              this.receipt = await batchTransferFrom_ERC721(this.token, owner, this.toWhom, nfts, {from: from});
            });
  
            it('should transfer the tokens to the new owner', async function () {
              for (const nft of nfts) {
                const newOwner = await this.token.ownerOf(nft);
                newOwner.should.not.equal(owner);
                newOwner.should.equal(this.toWhom);
              }
            });
  
            it('should increase the non-fungible token balance of the new owner', async function () {
              for (let index = 0; index != nfts.length; ++index) {
                const nft = nfts[index];
                (await this.token.balanceOf(this.toWhom, nft)).should.be.bignumber.equal(this.nftBalanceToWhom[index].addn(1));
              }
            });
  
            it('should decrease the non-fungible token balance of the previous owner', async function () {
              for (let index = 0; index != nfts.length; ++index) {
                const nft = nfts[index];
                (await this.token.balanceOf(owner, nft)).should.be.bignumber.equal(this.nftBalanceOwner[index].subn(1));
              }
            });
  
            it('should increase the non-fungible collection balance of the new owner', async function () {
              (await this.token.balanceOf(this.toWhom, nfCollection)).should.be.bignumber.equal(this.collection1BalanceToWhom.addn(collection1Nfts.length));
              (await this.token.balanceOf(this.toWhom, nfCollection2)).should.be.bignumber.equal(this.collection2BalanceToWhom.addn(collection2Nfts.length));
            });
  
            it('should decrease the non-fungible collection balance of the previous owner', async function () {
              (await this.token.balanceOf(owner, nfCollection)).should.be.bignumber.equal(this.collection1BalanceOwner.subn(collection1Nfts.length));
              (await this.token.balanceOf(owner, nfCollection2)).should.be.bignumber.equal(this.collection2BalanceOwner.subn(collection2Nfts.length));
            });
  
            it('should emit the Transfer event', async function () {
              for (let index = 0; index != nfts.length; ++index) {
                const nft = nfts[index];
                expectEvent(
                  this.receipt,
                  'Transfer',
                  {
                    _from: owner,
                    _to: this.toWhom,
                    _tokenId: nft
                  }
                );
              }
            });
  
            it('should emit the TransferBatch event', async function () {
              expectEvent(
                this.receipt,
                'TransferBatch',
                {
                  _operator: from,
                  _from: owner,
                  _to: this.toWhom,
                  _ids: nfts,
                  _values: Array(nfts.length).fill(1),
                }
              );
            });
          };

          context('transferred to a user account', function () {
              beforeEach(async function () {
                  this.toWhom = other;
              });

              context('when called by the owner', function () {
                transferFrom(owner);
              });
  
              context('when called by an operator', function () {
                beforeEach(async function () {
                  await this.token.setApprovalForAll(operator, true, { from: owner });
                });
  
                transferFrom(operator);
          });

              context('when called by an approved sender', function () {
                beforeEach(async function () {
                  for (const nft of nfts) {
                    await this.token.approve(approved, nft, { from: owner });
                  }
                });
  
                transferFrom(approved);
              });
            });

          context('transferred to an ERC-1155 receiver contract', function () {
            beforeEach(async function () {
              this.toWhom = this.receiver.address;
            })

            const transferFromToReceiver = function (from) {
              transferFrom(from);

            it('should safely receive', async function () {
              await expectEvent.inTransaction(
                this.receipt.tx,
                this.receiver,
                'ReceivedBatch',
                {
                    operator: from,
                  from: owner,
                  ids: nfts,
                  values: Array(nfts.length).fill(1),
                  data: null,
                }
              );
            });
            };

            context('when called by the owner', function () {
              transferFromToReceiver(owner);
            });

            context('when called by an operator', function () {
              beforeEach(async function () {
                await this.token.setApprovalForAll(operator, true, { from: owner });
              });

              transferFromToReceiver(operator);
            });

            context('when called by an approved sender', function () {
              beforeEach(async function () {
                for (const nft of nfts) {
                  await this.token.approve(approved, nft, { from: owner });
                }
              });

              transferFromToReceiver(approved);
            });
          });
        });
      });
    });

    describe('transfer functions', function () {
      context('safeTransferFrom', function () {
        it('should revert if `to` is the zero address', async function () {
          await expectRevert(
            safeTransferFrom(this.token, owner, ZeroAddress, nft1, 1, data, {from: owner}),
            revertMessages.TransferToZero
          );
        });

        // TODO: write missing tests
      });

      context('safeBatchTransferFrom', function () {
        it('should revert if `to` is the zero address', async function () {
          safeBatchTransferFrom(this.token, owner, ZeroAddress, [nft1], [1], data, {from: owner}),
          revertMessages.TransferToZero
        });

        // TODO: write missing tests
      });
    });

    // TODO add receiver checks
    /*
    _transferFrom_ERC721(address from, address to, uint256 nftId, bytes memory data, bool safe)
        event Transfer(address _from, address _to, uint256 _tokenId)
        event TransferSingle(address _operator, address _from, address _to, uint256 _id, uint256 _value)
        // if `to` is a contract
            // if `to` is ERC1155TokenReceiver
                event ReceivedSingle(address operator, address from, uint256 id, uint256 value, bytes data, uint256 gas)
            // else
                event Received(address operator, address from, uint256 tokenId, bytes data, uint256 gas)
    _batchTransferFrom_ERC721(address from, address to, uint256[] memory nftIds)
        // foreach `nftId` in the batch
            event Transfer(address _from, address _to, uint256 _tokenId)
        event TransferBatch(address _operator, address _from, address _to, uint256[] _ids, uint256[] _values)
        // if `to` is a contract and is ERC1155TokenReceiver
            event ReceivedBatch(address operator, address from, uint256[] ids, uint256[] values, bytes data, uint256 gas);
    _safeTransferFrom(address from, address to, uint256 id, uint256 value, bytes memory data)
        // if `id` is an NFT ID
            event Transfer(address _from, address _to, uint256 _tokenId)
        event TransferSingle(address _operator, address _from, address _to, uint256 _id, uint256 _value)
        // if `to` is a contract
            event ReceivedSingle(address operator, address from, uint256 id, uint256 value, bytes data, uint256 gas)
    _safeBatchTransferFrom(address from, address to, uint256[] memory ids, uint256[] memory values, bytes memory data)
        // foreach `id` in the batch
            // if `id` is an NFT ID
                event Transfer(address _from, address _to, uint256 _tokenId)
        event TransferBatch(address _operator, address _from, address _to, uint256[] _ids, uint256[] _values)
        // if `to` is a contract
            event ReceivedBatch(address operator, address from, uint256[] ids, uint256[] values, bytes data, uint256 gas);
    */
  });
}
module.exports = {
    shouldBehaveLikeERC1155721Inventory,
};

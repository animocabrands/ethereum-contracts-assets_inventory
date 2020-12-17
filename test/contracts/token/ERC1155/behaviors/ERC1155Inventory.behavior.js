const { contract } = require('@openzeppelin/test-environment');
const { BN, expectEvent, expectRevert } = require('@openzeppelin/test-helpers');

const { constants } = require('@animoca/ethereum-contracts-core_library');
const { ZeroAddress } = constants;
const { EmptyByte } = require('@animoca/ethereum-contracts-core_library/src/constants');

const { makeFungibleCollectionId, makeNonFungibleCollectionId, makeNonFungibleTokenId } = require('@animoca/blockchain-inventory_metadata').inventoryIds;

const ERC1155TokenReceiverMock = contract.fromArtifact('ERC1155TokenReceiverMock');

function shouldBehaveLikeERC1155Inventory(
  {nfMaskLength, mint},
  [creator, owner, operator, other]
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
  const unknownFCollection = {
    id: makeFungibleCollectionId(3),
    supply: 0
  };
  const nfCollection1 = makeNonFungibleCollectionId(1, nfMaskLength);
  const nfCollection2 = makeNonFungibleCollectionId(2, nfMaskLength);
  const unknownNFCollection = makeNonFungibleCollectionId(99, nfMaskLength);
  const nft1 = makeNonFungibleTokenId(1, 1, nfMaskLength);
  const nft2 = makeNonFungibleTokenId(1, 2, nfMaskLength);
  const nft3 = makeNonFungibleTokenId(2, 2, nfMaskLength);
  const unknownNft = makeNonFungibleTokenId(99, 99, nfMaskLength);


  describe('like an ERC1155Inventory', function () {
    beforeEach(async function () {
      await mint(this.token, owner, fCollection1.id, fCollection1.supply, '0x', { from: creator });
      await mint(this.token, owner, fCollection2.id, fCollection2.supply, '0x', { from: creator });
      await mint(this.token, owner, fCollection3.id, fCollection3.supply, '0x', { from: creator });
      await mint(this.token, owner, nft1, 1, '0x', { from: creator });
      await mint(this.token, owner, nft2, 1, '0x', { from: creator });
      await mint(this.token, owner, nft3, 1, '0x', { from: creator }); 
      this.toWhom = other; // default to anyone for toWhom in context-dependent tests
    });

    describe('createCollection()', function () {

      const collections = {
        fCollection1: makeFungibleCollectionId(1, nfMaskLength),
        fCollection2: makeFungibleCollectionId(2, nfMaskLength),
        fCollection3: makeFungibleCollectionId(3, nfMaskLength),
        nfCollection1: makeNonFungibleCollectionId(1, nfMaskLength),
        nfCollection2: makeNonFungibleCollectionId(2, nfMaskLength),
        nfCollection3: makeNonFungibleCollectionId(3, nfMaskLength)
      };

      beforeEach(async function () {
        this.createCollectionReceipt = {};

        for (const collection of Object.values(collections)) {
          // const isNFT = await this.token.callIsNFT(collection);
          const isNFT = await this.token.isNFT(collection);
          isNFT.should.be.false;

          this.createCollectionReceipt[collection] =
            await this.token.createCollection(collection, { from: creator });
        }

        this.contract = this.token;
      });
    });


    describe('isFungible()', function () {
      context("when id is a Fungible Token", function () {
        it("returns true", async function () {
          (await this.token.isFungible(fCollection1.id)).should.be.equal(true);
        });
      });
      context("when id is a Non-Fungible Collection", function () {
        it("returns false", async function () {
          (await this.token.isFungible(nfCollection1)).should.be.equal(false);
        });
      });
      context("when id is an existing Non-Fungible Token", function () {
        it("returns false", async function () {
          (await this.token.isFungible(nft1)).should.be.equal(false);
        });
      });
      context("when id is a non-existing Non-Fungible Token", function () {
        it("returns false", async function () {
          (await this.token.isFungible(unknownNft)).should.be.equal(false);
        });
      });
    });

    describe('collectionOf()', function () {
      context("when id is a Fungible Token", function () {
        it("throws", async function () {
          await expectRevert.unspecified(this.token.collectionOf(fCollection1.id));
        });
      });
      context("when id is a Non-Fungible Collection", function () {
        it("throws", async function () {
          await expectRevert.unspecified(this.token.collectionOf(nfCollection1));
        });
      });
      context("when id is an existing Non-Fungible Token", function () {
        it("returns the collection", async function () {
          (await this.token.collectionOf(nft1)).toString(10).should.be.equal(nfCollection1);
        });
      });
      context("when id is a non-existing Non-Fungible Token", function () {
        it("returns the collection", async function () {
          (await this.token.collectionOf(unknownNft)).toString(10).should.be.equal(unknownNFCollection);
        });
      });
    });

    describe('ownerOf()', function () {
      context("when id is a Fungible Token", function () {
        it("throws", async function () {
          await expectRevert.unspecified(this.token.ownerOf(fCollection1.id));
        });
      });
      context("when id is a Non-Fungible Collection", function () {
        it("throws", async function () {
          await expectRevert.unspecified(this.token.ownerOf(nfCollection1));
        });
      });
      context("when id is an existing Non-Fungible Token", function () {
        it("returns the owner", async function () {
          (await this.token.ownerOf(nft1)).toString(10).should.be.equal(owner);
        });
      });
      context("when id is a non-existing Non-Fungible Token", function () {
        it("throws", async function () {
          await expectRevert.unspecified(this.token.ownerOf(unknownNft));
        });
      });
    });

    describe('totalSupply()', function () {
      context('for a non-fungible token', function () {
        it('returns the non-fungible token total supply', async function () {
          (await this.token.totalSupply(nft1)).should.be.bignumber.equal('1');
        });
      });

      context('for a non-fungible collection', function () {
        it('returns the non-fungible collection total supply', async function () {
          (await this.token.totalSupply(nfCollection1)).should.be.bignumber.equal('1');
        });
      });

      context('for a fungible collection', function () {
        it('returns the fungible collection total supply', async function () {
          (await this.token.totalSupply(fCollection1.id)).should.be.bignumber.equal(fCollection1.supply.toString());
        });
      });
    });

    describe('balanceOf', function () {
      context('when the given address owns some tokens', function () {
        it('returns the amount of nf tokenId owned by the given address', async function () {
          (await this.token.balanceOf(owner, nft1)).should.be.bignumber.equal('1');
          (await this.token.balanceOf(owner, nft2)).should.be.bignumber.equal('1');
          (await this.token.balanceOf(owner, nft3)).should.be.bignumber.equal('1');
        });

        it('returns the amount of nft collectionId owned by the given address', async function () {
          (await this.token.balanceOf(owner, nfCollection1)).should.be.bignumber.equal('1');
          (await this.token.balanceOf(owner, nfCollection2)).should.be.bignumber.equal('2');
        });

        it('returns the amount of ft collectionId owned by the given address', async function () {
          (await this.token.balanceOf(owner, fCollection1.id)).should.be.bignumber.equal('10');
          (await this.token.balanceOf(owner, fCollection2.id)).should.be.bignumber.equal('23');
        });
      });

      context('when the given address does not own any tokens', function () {
        it('returns 0 of given nf token id', async function () {
          (await this.token.balanceOf(other, nft1)).should.be.bignumber.equal('0');
        });

        it('returns 0 of given nft collection id', async function () {
          (await this.token.balanceOf(other, nfCollection1)).should.be.bignumber.equal('0');
        });

        it('returns 0 of given ft collection id', async function () {
          (await this.token.balanceOf(other, fCollection1.id)).should.be.bignumber.equal('0');
        });
      });

      context('when querying the zero address', function () {
        // const revertMessage = "Inventory: zero address";
        it('throws when query nf token id', async function () {
          await expectRevert.unspecified(this.token.balanceOf(ZeroAddress, nft1));
        //   await expectRevert(this.token.balanceOf(ZeroAddress, nft1), revertMessage);
        });

        it('throws when query nft collection id', async function () {
          await expectRevert.unspecified(this.token.balanceOf(ZeroAddress, nfCollection1));
        });

        it('throws when query ft collection id', async function () {
          await expectRevert.unspecified(this.token.balanceOf(ZeroAddress, fCollection1.id));
        });
      });
    });

    describe('balanceOfBatch', function () {
      context('when the given addresses own some tokens', function () {
        it('returns the amounts of tokens owned by the given addresses, case 1', async function () {
          let owners = [owner, owner, owner, owner, owner];
          let ids = [nft1, nft2, nft3, fCollection1.id, fCollection2.id];
          const balances = await this.token.balanceOfBatch(owners, ids);
          balances.map(t => t.toNumber()).should.have.members([1, 1, 1, 10, 23]);
        });

        it('returns the amounts of tokens owned by the given addresses, case 2', async function () {
          let owners = [owner, owner, owner, owner];
          let ids = [nft1, nfCollection1, fCollection1.id, fCollection2.id];
          const balances = await this.token.balanceOfBatch(owners, ids);
          balances.map(t => t.toNumber()).should.have.members([1, 1, 10, 23]);
        });

        it('returns the amounts of tokens owned by the given addresses, case 3', async function () {
          let owners = [owner, owner, owner, owner];
          let ids = [nfCollection1, nfCollection2, fCollection1.id, fCollection2.id];
          const balances = await this.token.balanceOfBatch(owners, ids);
          balances.map(t => t.toNumber()).should.have.members([1, 2, 10, 23]);
        });

        it('returns the amounts of tokens owned by the given addresses, case 4', async function () {
          let owners = [owner, owner, owner];
          let ids = [nft1, nft2, nft3];
          const balances = await this.token.balanceOfBatch(owners, ids);
          balances.map(t => t.toNumber()).should.have.members([1, 1, 1]);
        });

        it('returns the amounts of tokens owned by the given addresses, case 5', async function () {
          let owners = [owner, owner];
          let ids = [fCollection1.id, fCollection2.id];
          const balances = await this.token.balanceOfBatch(owners, ids);
          balances.map(t => t.toNumber()).should.have.members([10, 23]);
        });
      });

      context('when the given address does not own any tokens', function () {
        it('returns 0 of given nf token id', async function () {
          const balances = await this.token.balanceOfBatch([other], [nft1]);
          balances.map(t => t.toNumber()).should.have.members([0]);
        });

        it('returns 0 of given nft collection id', async function () {
          const balances = await this.token.balanceOfBatch([other], [nfCollection1]);
          balances.map(t => t.toNumber()).should.have.members([0]);
        });

        it('returns 0 of given ft collection id', async function () {
          const balances = await this.token.balanceOfBatch([other], [fCollection1.id]);
          balances.map(t => t.toNumber()).should.have.members([0]);
        });
      });

      context('when querying the zero address', function () {
        it('throws when query nf token id', async function () {
          await expectRevert.unspecified(this.token.balanceOfBatch([ZeroAddress], [nft1]));
        });

        it('throws when query nft collection id', async function () {
          await expectRevert.unspecified(this.token.balanceOfBatch([ZeroAddress], [nfCollection1]));
        });

        it('throws when query ft collection id', async function () {
          await expectRevert.unspecified(this.token.balanceOfBatch([ZeroAddress], [fCollection1.id]));
        });
      });
    });

    describe('transfer', function () {
      describe('transfer a non fungible token', function () {
        let receipt = null;
        const data = '0x42';

        beforeEach(async function () {
          // TODO move to ERC1155721 behaviour
          // await this.token.approve(approved, nft1, { from: owner });
          await this.token.setApprovalForAll(operator, true, { from: owner });
        });

        const transferWasSuccessful = function ({ owner, tokenId, collectionId, approvedAccount }) {
          it('transfers the ownership of the given token ID to the given address', async function () {
            (await this.token.ownerOf(tokenId)).should.be.equal(this.toWhom);
          });

        // TODO move to ERC1155721 behaviour

          // it('clears the approval for the token ID', async function () {
          //   (await this.token.getApproved(tokenId)).should.be.equal(ZeroAddress);
          // });

          it('emits a TransferSingle event', async function () {
            if (approvedAccount) {
              expectEvent(receipt, 'TransferSingle', {
                _operator: approvedAccount,
                _from: owner,
                _to: this.toWhom,
                _id: tokenId,
                _value: new BN("1"),
              });
            } else {
              expectEvent(receipt, 'TransferSingle', {
                _operator: owner,
                _from: owner,
                _to: this.toWhom,
                _id: tokenId,
                _value: new BN("1"),
              });
            }
          });

          it('adjusts owners nft collectionId balances', async function () {
            (await this.token.balanceOf(owner, collectionId)).should.be.bignumber.equal('0');
          });

          it('adjusts recipient nft collectionId balances', async function () {
            (await this.token.balanceOf(this.toWhom, collectionId)).should.be.bignumber.equal('1');
          });
        };

        const shouldTransferTokensByUsers = function (transferFunction, tokenId, collectionId) {
          context('when called by the owner', function () {
            beforeEach(async function () {
              receipt = await transferFunction.call(this, owner, this.toWhom, tokenId, new BN(1), data, { from: owner });
            });
            transferWasSuccessful({ owner, tokenId, collectionId, approvedAccount: null });
          });

        // TODO move to ERC1155721 behaviour

          // context('when called by the approved individual', function () {
          //   beforeEach(async function () {
          //     receipt = await transferFunction.call(this, owner, this.toWhom, tokenId, new BN(1), data, { from: approved });
          //   });
          //   transferWasSuccessful({ owner, tokenId, collectionId, approvedAccount: approved });
          // });

          context('when called by the operator', function () {
            beforeEach(async function () {
              receipt = await transferFunction.call(this, owner, this.toWhom, tokenId, new BN(1), data, { from: operator });
            });
            transferWasSuccessful({ owner, tokenId, collectionId, approvedAccount: operator });
          });

        // TODO move to ERC1155721 behaviour

        //   context('when called by the owner without an approved user', function () {
        //     beforeEach(async function () {
        //       // await this.token.approve(ZeroAddress, tokenId, { from: owner });
        //       receipt = await transferFunction.call(this, owner, this.toWhom, tokenId, new BN(1), data, { from: operator });
        //     });
        //     transferWasSuccessful({ owner, tokenId, collectionId, approvedAccount: operator });
        //   });

          context('when sent to the owner', function () {
            beforeEach(async function () {
              receipt = await transferFunction.call(this, owner, owner, tokenId, new BN(1), data, { from: owner });
            });

            it('keeps ownership of the token', async function () {
              (await this.token.ownerOf(tokenId)).should.be.equal(owner);
            });

            // TODO move to ERC1155721 behaviour
            // it('clears the approval for the token ID', async function () {
            //   (await this.token.getApproved(tokenId)).should.be.equal(ZeroAddress);
            // });

            it('emits a transferSingle event', async function () {
              expectEvent(receipt, 'TransferSingle', {
                _operator: owner,
                _from: owner,
                _to: owner,
                _id: tokenId,
                _value: new BN(1)
              });
            });

            // TODO move to ERC1155721 behaviour
            // it('keeps the owner balance', async function () {
            //   (await this.token.balanceOf(owner)).should.be.bignumber.equal('3');
            // });

            it('keeps the owner collectionId balance', async function () {
              (await this.token.balanceOf(owner, collectionId)).should.be.bignumber.equal('1');
            });
          });

          context('when the address of the previous owner is incorrect', function () {
            it('reverts', async function () {
              await expectRevert.unspecified(transferFunction.call(this, other, other, tokenId, new BN(1), data, { from: owner })
              );
            });
          });

          context('when the sender is not authorized for the token id', function () {
            it('reverts', async function () {
              await expectRevert.unspecified(transferFunction.call(this, owner, other, tokenId, new BN(1), data, { from: other })
              );
            });
          });

          context('when the given token ID does not exist', function () {
            it('reverts', async function () {
              await expectRevert.unspecified(transferFunction.call(this, owner, other, unknownNft, new BN(1), data, { from: owner })
              );
            });
          });

          context('when the address to transfer the token to is the zero address', function () {
            it('reverts', async function () {
              await expectRevert.unspecified(transferFunction.call(this, owner, ZeroAddress, tokenId, new BN(1), data, { from: owner }));
            });
          });

          context('when supply bigger than 1', function () {
            it('reverts', async function () {
              await expectRevert.unspecified(transferFunction.call(this, owner, this.toWhom, tokenId, new BN(2), data, { from: owner })
              );
            });
          });

          context('when supply smaller than 1', function () {
            it('reverts', async function () {
              await expectRevert.unspecified(transferFunction.call(this, owner, this.toWhom, tokenId, new BN(0), data, { from: owner })
              );
            });
          });

          context('when transfer with token collection id', function () {
            it('reverts', async function () {
              await expectRevert.unspecified(transferFunction.call(this, owner, this.toWhom, collectionId, new BN(1), data, { from: owner })
              );
            });
          });
        };

        describe('via safeTransferFrom', function () {
          const safeTransferFromWithData = function (from, to, tokenId, supply, data, opts) {
            return this.token.methods['safeTransferFrom(address,address,uint256,uint256,bytes)'](from, to, tokenId, supply, data, opts);
          };

          const shouldTransferSafely = function (transferFun, tokenId, collectionId, supply, data) {
            describe('to a user account', function () {
              shouldTransferTokensByUsers(transferFun, tokenId, collectionId);
            });

            describe('to a valid receiver contract', function () {
              beforeEach(async function () {
                this.receiver = await ERC1155TokenReceiverMock.new(true, { from: creator });
                this.toWhom = this.receiver.address;
              });

              shouldTransferTokensByUsers(transferFun, tokenId, collectionId);

              it('should call onERC1155Received', async function () {
                const receipt = await transferFun.call(this, owner, this.toWhom, tokenId, supply, data, { from: owner });

                await expectEvent.inTransaction(receipt.tx, ERC1155TokenReceiverMock, 'ReceivedSingle', {
                  operator: owner,
                  from: owner,
                  id: tokenId,
                  value: supply,
                  data: data,
                });
              });

                // TODO move to ERC1155721 behaviour
              // it('should call onERC1155Received from approved', async function () {
              //   const receipt = await transferFun.call(this, owner, this.toWhom, tokenId, supply, data, { from: approved });

              //   await expectEvent.inTransaction(receipt.tx, ERC1155ReceiverMock, 'Received', {
              //     operator: approved,
              //     from: owner,
              //     tokenId: tokenId,
              //     supply: supply,
              //     data: data,
              //   });
              // });

              describe('with an invalid token id', function () {
                it('reverts', async function () {
                  await expectRevert.unspecified(
                    transferFun.call(this, owner, this.receiver.address, unknownNft, supply, data, { from: owner })
                  );
                });
              });
            });
          };

          describe('with data', function () {
            shouldTransferSafely(safeTransferFromWithData, nft1, nfCollection1, new BN(1), data);
          });

          describe('to a receiver contract returning unexpected value', function () {
            it('reverts', async function () {
              const invalidReceiver = await ERC1155TokenReceiverMock.new(false, { from: creator });
              await expectRevert.unspecified(
                this.token.contract.methods.safeTransferFrom(owner, invalidReceiver.address, nft1.toString(10), 1, data).send({ from: owner, gas: 4000000 })
              );
            });
          });

          describe('to a contract that does not implement the required function', function () {
            it('reverts', async function () {
              const invalidReceiver = this.token;
              await expectRevert.unspecified(
                this.token.contract.methods.safeTransferFrom(owner, invalidReceiver.address, nft1.toString(10), 1, data).send({ from: owner, gas: 4000000 })
              );
            });
          });
        });
      });

      describe('transfer a fungible token', function () {
        let receipt = null;
        const data = '0x42';
        const transferValue = new BN(5);

        beforeEach(async function () {
          await this.token.setApprovalForAll(operator, true, { from: owner });
        });

        const transferWasSuccessful = function ({ owner, collectionId, operatorAccount }) {
          it('not effects ft collection id ownershipt', async function () {
            await expectRevert.unspecified(this.token.ownerOf(collectionId));
          });

          // TODO move to ERC1155721 behaviour
          // it('not effects ft collection id approval', async function () {
          //   await expectRevert.unspecified(this.token.getApproved(collectionId));
          // });

          it('emits a TransferSingle event', async function () {
            if (operatorAccount) {
              expectEvent(receipt, 'TransferSingle', {
                _operator: operatorAccount,
                _from: owner,
                _to: this.toWhom,
                _id: collectionId,
                _value: transferValue,
              });
            } else {
              expectEvent(receipt, 'TransferSingle', {
                _operator: owner,
                _from: owner,
                _to: this.toWhom,
                _id: collectionId,
                _value: transferValue,
              });
            }
          });

          // TODO move to ERC1155721 behaviour
          // it('not effets owner nft balance', async function () {
          //   (await this.token.balanceOf(owner)).should.be.bignumber.equal('3');
          // });

          // TODO move to ERC1155721 behaviour
          // it('not effetc recipient nft balance', async function () {
          //   (await this.token.balanceOf(this.toWhom)).should.be.bignumber.equal('0');
          // });

          it('adjusts owner ft collectionId balances', async function () {
            (await this.token.balanceOf(owner, collectionId)).toNumber().should.be.equal(fCollection1.supply - transferValue.toNumber());
          });

          it('adjusts recipient ft collectionId balances', async function () {
            (await this.token.balanceOf(this.toWhom, collectionId)).toNumber().should.be.equal(transferValue.toNumber());
          });
        };

        const shouldTransferTokensByUsers = function (transferFunction, collectionId) {
          context('when called by the owner', function () {
            beforeEach(async function () {
              receipt = await transferFunction.call(this, owner, this.toWhom, collectionId, transferValue, data, { from: owner });
            });
            transferWasSuccessful({ owner, collectionId, operatorAccount: null });
          });

          context('when called by the operator', function () {
            beforeEach(async function () {
              receipt = await transferFunction.call(this, owner, this.toWhom, collectionId, transferValue, data, { from: operator });
            });
            transferWasSuccessful({ owner, collectionId, operatorAccount: operator });
          });

          context('when sent to the owner', function () {
            beforeEach(async function () {
              receipt = await transferFunction.call(this, owner, owner, collectionId, transferValue, data, { from: owner });
            });

            it('not effects ownership of the ft collection id', async function () {
              await expectRevert.unspecified(this.token.ownerOf(collectionId));
            });

            // TODO move to ERC1155721 behaviour
            // it('not effects approval for the ft collection id', async function () {
            //   await expectRevert.unspecified(this.token.getApproved(collectionId));
            // });

            it('emits a transferSingle event', async function () {
              expectEvent(receipt, 'TransferSingle', {
                _operator: owner,
                _from: owner,
                _to: owner,
                _id: collectionId,
                _value: transferValue
              });
            });

            // TODO move to ERC1155721 behaviour
            // it('keeps the owner nft balance', async function () {
            //   (await this.token.balanceOf(owner)).should.be.bignumber.equal('3');
            // });

            it('keeps the owner ft collectionId balance', async function () {
              (await this.token.balanceOf(owner, collectionId)).toNumber().should.be.equal(fCollection1.supply);
            });
          });

          context('when the address of the previous owner is incorrect', function () {
            it('reverts', async function () {
              await expectRevert.unspecified(transferFunction.call(this, other, other, collectionId, transferValue, data, { from: owner })
              );
            });
          });

          context('when the sender is not authorized for the collection id', function () {
            it('reverts', async function () {
              await expectRevert.unspecified(transferFunction.call(this, owner, other, collectionId, transferValue, data, { from: other })
              );
            });
          });

          context('when the given collection ID does not exist', function () {
            it('reverts', async function () {
              await expectRevert.unspecified(transferFunction.call(this, owner, other, unknownFCollection.id, transferValue, data, { from: owner })
              );
            });
          });

          context('when the address to transfer the token to is the zero address', function () {
            it('reverts', async function () {
              await expectRevert.unspecified(
                transferFunction.call(this, owner, ZeroAddress, collectionId, transferValue, data, { from: owner })
              );
            });
          });

          context('when supply smaller than 1', function () {
            it('reverts', async function () {
              await expectRevert.unspecified(transferFunction.call(this, owner, this.toWhom, collectionId, new BN(0), data, { from: owner })
              );
            });
          });

          context('when supply more than user balance', function () {
            it('reverts', async function () {
              await expectRevert.unspecified(transferFunction.call(this, owner, this.toWhom, collectionId, new BN(100), data, { from: owner })
              );
            });
          });
        };

        describe('via safeTransferFrom', function () {
          const safeTransferFromWithData = function (from, to, collectionId, supply, data, opts) {
            return this.token.methods['safeTransferFrom(address,address,uint256,uint256,bytes)'](from, to, collectionId, supply, data, opts);
          };

          const shouldTransferSafely = function (transferFun, collectionId, supply, data) {
            describe('to a user account', function () {
              shouldTransferTokensByUsers(transferFun, collectionId);
            });

            describe('to a valid receiver contract', function () {
              beforeEach(async function () {
                this.receiver = await ERC1155TokenReceiverMock.new(true, { from: creator });
                this.toWhom = this.receiver.address;
              });

              shouldTransferTokensByUsers(transferFun, collectionId);

              it('should call onERC1155Received', async function () {
                const receipt = await transferFun.call(this, owner, this.receiver.address, collectionId, supply, data, { from: owner });

                await expectEvent.inTransaction(receipt.tx, ERC1155TokenReceiverMock, 'ReceivedSingle', {
                  operator: owner,
                  from: owner,
                  id: collectionId,
                  value: supply,
                  data: data,
                });
              });

              it('should call onERC1155Received from operator', async function () {
                const receipt = await transferFun.call(this, owner, this.receiver.address, collectionId, supply, data, { from: operator });

                await expectEvent.inTransaction(receipt.tx, ERC1155TokenReceiverMock, 'ReceivedSingle', {
                  operator: operator,
                  from: owner,
                  id: collectionId,
                  value: supply,
                  data: data,
                });
              });

              describe('with an invalid token id', function () {
                it('reverts', async function () {
                  await expectRevert.unspecified(
                    transferFun.call(this, owner, this.receiver.address, unknownFCollection.id, supply, data, { from: owner })
                  );
                });
              });
            });
          };

          describe('with data', function () {
            shouldTransferSafely(safeTransferFromWithData, fCollection1.id, transferValue, data);
          });

          describe('to a receiver contract returning unexpected value', function () {
            it('reverts', async function () {
              const invalidReceiver = await ERC1155TokenReceiverMock.new(false, { from: creator });
              await expectRevert.unspecified(
                this.token.contract.methods.safeTransferFrom(owner, invalidReceiver.address, fCollection1.id.toString(10), 1, data).send({ from: owner, gas: 4000000 })
              );
            });
          });

          describe('to a contract that does not implement the required function', function () {
            it('reverts', async function () {
              const invalidReceiver = this.token;
              await expectRevert.unspecified(
                this.token.contract.methods.safeTransferFrom(owner, invalidReceiver.address, fCollection1.id.toString(10), 1, data).send({ from: owner, gas: 4000000 })
              );
            });
          });
        });
      });
    });

    describe('batch transfer', function () {
      let receipt = null;
      const data = '0x42';

      beforeEach(async function () {
        // TODO move to ERC1155721 behaviour
        // await this.token.approve(approved, nft1, { from: owner });
        // await this.token.approve(approved, nft2, { from: owner });
        // await this.token.approve(approved, nft3, { from: owner });
        await this.token.setApprovalForAll(operator, true, { from: owner });
      });

      const transferWasSuccessful = function ({ owner, ids, collectionIds, supplies, operatorAccount }) {
        it('transfers the ownership of the nft ID to the given address, not effects ft items', async function () {
          for (let id of ids) {
            try {
              (await this.token.ownerOf(id)).should.be.equal(this.toWhom);
            } catch (err) {
              await expectRevert.unspecified(this.token.ownerOf(id));
            }
          }
        });

        // TODO move to ERC1155721 behaviour
        // it('clears the approval for the nft ID, not effects ft items', async function () {
        //   for (let id of ids) {
        //     try {
        //       (await this.token.getApproved(id)).should.be.equal(ZeroAddress);
        //     } catch (err) {
        //       await expectRevert.unspecified(this.token.getApproved(id));
        //     }
        //   }
        // });

        it('emits a TransferBatch event', async function () {
          if (operatorAccount) {
            expectEvent(receipt, 'TransferBatch', {
              _operator: operatorAccount,
              _from: owner,
              _to: this.toWhom,
              _ids: ids,
              _values: supplies,
            });
          } else {
            expectEvent(receipt, 'TransferBatch', {
              _operator: owner,
              _from: owner,
              _to: this.toWhom,
              _ids: ids,
              _values: supplies,
            });
          }
        });

        it('adjusts owners collectionId balances', async function () {
          for (let collectionId of collectionIds)
            (await this.token.balanceOf(owner, collectionId)).should.be.bignumber.equal('0');
        });

        it('adjusts recipient collectionId balances', async function () {
          (await this.token.balanceOf(this.toWhom, fCollection1.id)).should.be.bignumber.equal('10');
          (await this.token.balanceOf(this.toWhom, fCollection2.id)).should.be.bignumber.equal('23');
          (await this.token.balanceOf(this.toWhom, nfCollection1)).should.be.bignumber.equal('1');
          (await this.token.balanceOf(this.toWhom, nfCollection2)).should.be.bignumber.equal('2');
        });
      };

      const shouldTransferTokensByUsers = function (transferFunction, ids, collectionIds, supplies) {
        context('when called by the owner', function () {
          beforeEach(async function () {
            receipt = await transferFunction.call(this, owner, this.toWhom, ids, supplies, data, { from: owner });
          });
          transferWasSuccessful({ owner, ids, collectionIds, supplies, operatorAccount: null });
        });

        context('when called by the operator', function () {
          beforeEach(async function () {
            receipt = await transferFunction.call(this, owner, this.toWhom, ids, supplies, data, { from: operator });
          });
          transferWasSuccessful({ owner, ids, collectionIds, supplies, operatorAccount: operator });
        });

        context('when called by the owner without an approved user', function () {
          beforeEach(async function () {
          // TODO move to ERC1155721 behaviour
            // await this.token.approve(ZeroAddress, nft1, { from: owner });
            // await this.token.approve(ZeroAddress, nft1, { from: owner });
            // await this.token.approve(ZeroAddress, nft1, { from: owner });
            receipt = await transferFunction.call(this, owner, this.toWhom, ids, supplies, data, { from: operator });
          });
          transferWasSuccessful({ owner, ids, collectionIds, supplies, operatorAccount: operator });
        });

        context('when sent to the owner', function () {
          beforeEach(async function () {
            receipt = await transferFunction.call(this, owner, owner, ids, supplies, data, { from: owner });
          });

          it('keeps ownership of the nfts', async function () {
            for (let id of ids) {
              try {
                const collectionId = await this.token.ownerOf(id); //throws if not NFT id
                (await this.token.ownerOf(id)).should.be.equal(owner);
              } catch (err) {
                await expectRevert.unspecified(this.token.ownerOf(id));
              }
            }
          });

          // TODO move to ERC1155721 behaviour
          // it('clears the approval for the nft ID', async function () {
          //   for (let id of ids) {
          //     try {
          //       const collectionId = await this.token.ownerOf(id); //throws if not NFT id
          //       (await this.token.getApproved(id)).should.be.equal(ZeroAddress);
          //     } catch (err) {
          //       await expectRevert.unspecified(this.token.ownerOf(id));
          //     }
          //   }
          // });

          it('emits a TransferBatch event', async function () {
            expectEvent(receipt, 'TransferBatch', {
              _operator: owner,
              _from: owner,
              _to: owner,
              _ids: ids,
              _values: supplies
            });
          });

          // TODO move to ERC1155721 behaviour
          // it('keeps the owner balance', async function () {
          //   (await this.token.balanceOf(owner)).should.be.bignumber.equal('3');
          // });

          it('keeps the owner collectionId balance', async function () {
            (await this.token.balanceOf(owner, fCollection1.id)).should.be.bignumber.equal('10');
            (await this.token.balanceOf(owner, fCollection2.id)).should.be.bignumber.equal('23');
            (await this.token.balanceOf(owner, nfCollection1)).should.be.bignumber.equal('1');
            (await this.token.balanceOf(owner, nfCollection2)).should.be.bignumber.equal('2');
          });
        });

        context('when the address of the previous owner is incorrect', function () {
          it('reverts', async function () {
            await expectRevert.unspecified(transferFunction.call(this, other, other, ids, supplies, data, { from: owner })
            );
          });
        });

        context('when the sender is not authorized for the token id', function () {
          it('reverts', async function () {
            await expectRevert.unspecified(transferFunction.call(this, owner, other, ids, supplies, data, { from: other })
            );
          });
        });

        // TODO Move to ERC11557221
        // context('when the sender is only authorized for the nft, not for ft', function () {
        //   it('reverts', async function () {
        //     await expectRevert.unspecified(transferFunction.call(this, owner, other, ids, supplies, data, { from: approved })
        //     );
        //   });
        // });

        context('when the given token ID does not exist', function () {
          it('reverts', async function () {
            await expectRevert.unspecified(transferFunction.call(this, owner, other, [unknownNft, nft1, fCollection1.id], [new BN(1), new BN(1), new BN(1)], data, { from: owner })
            );
          });
        });

        context('when the address to transfer the token to is the zero address', function () {
          it('reverts', async function () {
            await expectRevert.unspecified(
              transferFunction.call(this, owner, ZeroAddress, ids, supplies, data, { from: owner })
            );
          });
        });

        context('when nft supply bigger than 1', function () {
          it('reverts', async function () {
            await expectRevert.unspecified(transferFunction.call(this, owner, this.toWhom, [nft1], [new BN(2)], data, { from: owner })
            );
          });
        });

        context('when nft supply smaller than 1', function () {
          it('reverts', async function () {
            await expectRevert.unspecified(transferFunction.call(this, owner, this.toWhom, [nft1], [new BN(0)], data, { from: owner })
            );
          });
        });

        context('when transfer with nft collection id', function () {
          it('reverts', async function () {
            await expectRevert.unspecified(transferFunction.call(this, owner, this.toWhom, [nfCollection1], [new BN(0)], data, { from: owner })
            );
          });
        });

        context('when ft supply smaller than 1', function () {
          it('reverts', async function () {
            await expectRevert.unspecified(transferFunction.call(this, owner, this.toWhom, [fCollection1.id], [new BN(0)], data, { from: owner })
            );
          });
        });

        context('param arrays length do not match', function () {
          it('reverts', async function () {
            await expectRevert.unspecified(this.token.safeBatchTransferFrom(owner, this.toWhom, [nft1, fCollection1.id], [new BN(1)], data, { from: owner })
            );
          });
        });

        context('transfer ft with supply more than owner balance', function () {
          it('reverts', async function () {
            await expectRevert.unspecified(this.token.safeBatchTransferFrom(owner, this.toWhom, [nft1, fCollection1.id], [new BN(1), new BN(11)], data, { from: creator })
            );
          });
        });
      };

      describe('via safeBatchTransferFrom', function () {
        const safeTransferFromWithData = function (from, to, ids, supplies, data, opts) {
          return this.token.methods['safeBatchTransferFrom(address,address,uint256[],uint256[],bytes)'](from, to, ids, supplies, data, opts);
        };

        const shouldTransferSafely = function (transferFun, ids, collectionIds, supplies, data) {
          describe('to a user account', function () {
            shouldTransferTokensByUsers(transferFun, ids, collectionIds, supplies);
          });

          describe('to a valid receiver contract', function () {
            beforeEach(async function () {
              this.receiver = await ERC1155TokenReceiverMock.new(true, { from: creator });
              this.toWhom = this.receiver.address;
            });

            shouldTransferTokensByUsers(transferFun, ids, collectionIds, supplies);

            it('should call onERC1155Received', async function () {
              const receipt = await transferFun.call(this, owner, this.receiver.address, ids, supplies, data, { from: owner });

              await expectEvent.inTransaction(receipt.tx, ERC1155TokenReceiverMock, 'ReceivedBatch', {
                operator: owner,
                from: owner,
                ids,
                values: supplies,
                data: data,
              });
            });

            it('should call onERC1155Received from operator', async function () {
              const receipt = await transferFun.call(this, owner, this.receiver.address, ids, supplies, data, { from: operator });

              await expectEvent.inTransaction(receipt.tx, ERC1155TokenReceiverMock, 'ReceivedBatch', {
                operator: operator,
                from: owner,
                ids,
                values: supplies,
                data: data,
              });
            });

            describe('with an invalid token id', function () {
              it('reverts', async function () {
                await expectRevert.unspecified(
                  transferFun.call(this, owner, this.receiver.address, [unknownFCollection.id], [new BN(1)], data, { from: owner })
                );
              });
            });
          });
        };

        describe('with data', function () {
          shouldTransferSafely(safeTransferFromWithData,
            [nft1, nft2, nft3, fCollection1.id, fCollection2.id, fCollection2.id],
            [nfCollection1, nfCollection2, nfCollection2, fCollection1.id, fCollection2.id, fCollection2.id],
            [new BN(1), new BN(1), new BN(1), new BN(10), new BN(11), new BN(12)],
            data);
        });

        describe('to a receiver contract returning unexpected value', function () {
          it('reverts', async function () {
            const invalidReceiver = await ERC1155TokenReceiverMock.new(false, { from: creator });
            await expectRevert.unspecified(
              this.token.safeBatchTransferFrom(owner, invalidReceiver.address, [fCollection1.id], [new BN(1)], data, { from: owner })
            );
          });
        });

        describe('to a contract that does not implement the required function', function () {
          it('reverts', async function () {
            const invalidReceiver = this.token;
            await expectRevert.unspecified(
              this.token.safeBatchTransferFrom(owner, invalidReceiver.address, [fCollection1.id], [new BN(1)], data, { from: owner })
            );
          });
        });
      });
    });
  });
}

module.exports = {
  shouldBehaveLikeERC1155Inventory,
};

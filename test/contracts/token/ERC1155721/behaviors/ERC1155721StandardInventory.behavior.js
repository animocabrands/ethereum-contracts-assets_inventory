const {artifacts, accounts, web3} = require('hardhat');
const {createFixtureLoader} = require('@animoca/ethereum-contracts-core_library/test/utils/fixture');
const {BN, expectEvent, expectRevert} = require('@openzeppelin/test-helpers');

const {constants} = require('@animoca/ethereum-contracts-core_library');
const {One, ZeroAddress} = constants;

const {
  makeFungibleCollectionId,
  makeNonFungibleCollectionId,
  makeNonFungibleTokenId,
} = require('@animoca/blockchain-inventory_metadata').inventoryIds;

const ReceiverMock = artifacts.require('ERC1155721ReceiverMock');
const ReceiverMock721 = artifacts.require('ERC721ReceiverMock');

function shouldBehaveLikeERC1155721StandardInventory({nfMaskLength, contractName, revertMessages, deploy, methods, mint}) {
  const [deployer, owner, approved, operator, other] = accounts;

  const {'batchTransferFrom(address,address,uint256[])': batchTransferFrom_ERC721} = methods;

  if (batchTransferFrom_ERC721 === undefined) {
    console.log(
      `ERC1155721StandardInventory: non-standard ERC721 method batchTransfer(address,uint256[])` +
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
    id: makeFungibleCollectionId(2),
    supply: 12,
  };

  const nfCollection = makeNonFungibleCollectionId(1, nfMaskLength);
  const nfCollection2 = makeNonFungibleCollectionId(2, nfMaskLength);

  const nft1 = makeNonFungibleTokenId(1, 1, nfMaskLength);
  const nft2 = makeNonFungibleTokenId(1, 2, nfMaskLength);
  const nft3 = makeNonFungibleTokenId(2, 2, nfMaskLength);

  describe('like an ERC1155721StandardInventory', function () {
    // workaround for test cases that throw with `Error: Timeout of 2000ms exceeded`
    this.timeout(10000);

    const fixtureLoader = createFixtureLoader(accounts, web3.eth.currentProvider);
    const fixture = async function () {
      this.token = await deploy(deployer);
      await mint(this.token, owner, fCollection1.id, fCollection1.supply, {from: deployer});
      await mint(this.token, owner, fCollection2.id, fCollection2.supply, {from: deployer});
      await mint(this.token, owner, fCollection3.id, fCollection3.supply, {from: deployer});
      await mint(this.token, owner, nft1, 1, {from: deployer});
      await mint(this.token, owner, nft2, 1, {from: deployer});
      await mint(this.token, owner, nft3, 1, {from: deployer});

      this.receiver = await ReceiverMock.new(true, true);
      this.receiver721 = await ReceiverMock721.new(true);
    };

    beforeEach(async function () {
      await fixtureLoader(fixture, this);
      this.toWhom = other; // default to anyone for toWhom in context-dependent tests
    });

    const data = '0x42';

    describe('ERC721 functions on non-NFT ids', function () {
      beforeEach(async function () {
        await mint(this.token, owner, fCollection1.id, fCollection1.supply, {from: deployer});
        await mint(this.token, owner, fCollection2.id, fCollection2.supply, {from: deployer});
        this.toWhom = other; // default to anyone for toWhom in context-dependent tests
      });

      describe('ownerOf', function () {
        context('applied on a fungible token id', function () {
          it('reverts', async function () {
            await expectRevert(this.token.ownerOf(fCollection1.id), revertMessages.NonExistingNFT);
          });
        });

        context('applied on a non-fungible collection id', function () {
          it('reverts', async function () {
            await expectRevert(this.token.ownerOf(nfCollection), revertMessages.NonExistingNFT);
          });
        });
      });

      describe('approve', function () {
        const tokenId = fCollection1.id;

        context('applied on a fungible token id', function () {
          it('reverts', async function () {
            await expectRevert(this.token.approve(approved, fCollection1.id), revertMessages.NonExistingNFT);
          });
        });

        context('applied on a non-fungible collection id', function () {
          it('reverts', async function () {
            await expectRevert(this.token.approve(approved, nfCollection), revertMessages.NonExistingNFT);
          });
        });

        //     context('when approving a non-zero address', function () {
        //       it('reverts', async function () {
        //         await expectRevert.unspecified(this.token.approve(approved, tokenId, { from: owner }));
        //       });
        //     });

        //     context('when the address that receives the approval is the owner', function () {
        //       it('reverts', async function () {
        //         await expectRevert.unspecified(
        //           this.token.approve(owner, tokenId, { from: owner })
        //         );
        //       });
        //     });

        //     context('when the sender does not own the given token ID', function () {
        //       it('reverts', async function () {
        //         await expectRevert.unspecified(this.token.approve(approved, tokenId, { from: other }));
        //       });
        //     });

        //     context('when the sender is an operator', function () {
        //       it('reverts', async function () {
        //         await this.token.setApprovalForAll(operator, true, { from: owner });
        //         await expectRevert.unspecified(this.token.approve(approved, tokenId, { from: operator }));
        //       });
        //     });

        //     context('when the given token ID does not exist', function () {
        //       it('reverts', async function () {
        //         await expectRevert.unspecified(this.token.approve(approved, fCollection3.id, { from: owner }));
        //       });
        //     });
        //   });
      });

      describe('transferFrom', function () {
        it('reverts with a Fungible Token id', async function () {
          await expectRevert(this.token.transferFrom(owner, other, fCollection1.id, {from: owner}), revertMessages.NonOwnedNFT);
        });

        it('reverts with a Non-Fungible Collection id', async function () {
          await expectRevert(this.token.transferFrom(owner, other, nfCollection, {from: owner}), revertMessages.NonOwnedNFT);
        });
        // const data = '0x42';

        // beforeEach(async function () {
        //   await this.token.setApprovalForAll(operator, true, {from: owner});
        // });

        // const shouldNotTransferTokensByUsers = function (transferFunction, collectionId) {
        //   context('when called by the owner', function () {
        //     it('reverts', async function () {
        //       await expectRevert(transferFunction.call(this, owner, this.toWhom, collectionId, {from: owner}), 'fvgdfsv');
        //     });
        //   });

        //   context('when called by the operator', function () {
        //     it('reverts', async function () {
        //       await expectRevert(transferFunction.call(this, owner, this.toWhom, collectionId, {from: operator}), 'dfvdv');
        //     });
        //   });

        //   context('when sent to the owner', function () {
        //     it('reverts', async function () {
        //       await expectRevert(transferFunction.call(this, owner, owner, collectionId, {from: owner}), 'dfd');
        //     });
        //   });

        //   context('when the address of the previous owner is incorrect', function () {
        //     it('reverts', async function () {
        //       await expectRevert(transferFunction.call(this, owner, other, collectionId, {from: owner}), 'dwstg');
        //     });
        //   });

        //   context('when the sender is not authorized for the token id', function () {
        //     it('reverts', async function () {
        //       await expectRevert(transferFunction.call(this, owner, other, collectionId, {from: other}), 'efgv');
        //     });
        //   });

        //   context('when the given token ID does not exist', function () {
        //     it('reverts', async function () {
        //       await expectRevert(transferFunction.call(this, owner, other, fCollection3.id, {from: owner}), 'dvgfdsv');
        //     });
        //   });

        //   context('when the address to transfer the token to is the zero address', function () {
        //     it('reverts', async function () {
        //       await expectRevert(transferFunction.call(this, owner, ZeroAddress, collectionId, {from: owner}), 'regrethde');
        //     });
        //   });
        // };

        // describe('via transferFrom', function () {
        //   shouldNotTransferTokensByUsers(function (from, to, tokenId, opts) {
        //     return this.token.transferFrom(from, to, tokenId, opts);
        //   }, fCollection1.id);
        // });

        // describe('via safeTransferFrom', function () {
        //   const safeTransferFromWithData = function (from, to, tokenId, opts) {
        //     return this.token.methods['safeTransferFrom(address,address,uint256,bytes)'](from, to, tokenId, data, opts);
        //   };

        //   const safeTransferFromWithoutData = function (from, to, tokenId, opts) {
        //     return this.token.methods['safeTransferFrom(address,address,uint256)'](from, to, tokenId, opts);
        //   };

        //   const shouldNotTransferSafely = function (transferFun, data) {
        //     describe('to a user account', function () {
        //       shouldNotTransferTokensByUsers(transferFun, fCollection1.id);
        //     });

        //     describe('to a valid receiver contract', function () {
        //       beforeEach(async function () {
        //         this.receiver = await ReceiverMock.new(true, true);
        //         this.toWhom = this.receiver.address;
        //       });

        //       shouldNotTransferTokensByUsers(transferFun, fCollection1.id);

        //       describe('with an invalid token id', function () {
        //         it('reverts', async function () {
        //           await expectRevert.unspecified(transferFun.call(this, owner, this.receiver.address, fCollection3.id, {from: owner}));
        //         });
        //       });
        //     });
        //   };

        //   describe('with data', function () {
        //     shouldNotTransferSafely(safeTransferFromWithData, data);
        //   });

        //   describe('without data', function () {
        //     shouldNotTransferSafely(safeTransferFromWithoutData, null);
        //   });

        //   describe('to an ERC1155TokenReceiver contract refusing the transfer', function () {
        //     it('reverts', async function () {
        //       const invalidReceiver = await ReceiverMock.new(false, false);
        //       await expectRevert.unspecified(
        //         this.token.contract.methods
        //           .safeTransferFrom(owner, invalidReceiver.address, fCollection1.id.toString(10))
        //           .send({from: owner, gas: 4000000})
        //       );
        //     });
        //   });

        //   describe('to a non-receiver contract', function () {
        //     it('reverts', async function () {
        //       const invalidReceiver = this.token;
        //       await expectRevert.unspecified(
        //         this.token.contract.methods
        //           .safeTransferFrom(owner, invalidReceiver.address, fCollection1.id.toString(10))
        //           .send({from: owner, gas: 4000000})
        //       );
        //     });
        //   });
        // });
      });

      describe('safeTransferFrom(address,address,uint256)', function () {
        const method = 'safeTransferFrom(address,address,uint256)';
        it('reverts with a Fungible Token id', async function () {
          await expectRevert(this.token.methods[method](owner, other, fCollection1.id, {from: owner}), revertMessages.NonOwnedNFT);
        });

        it('reverts with a Non-Fungible Collection id', async function () {
          await expectRevert(this.token.methods[method](owner, other, nfCollection, {from: owner}), revertMessages.NonOwnedNFT);
        });
      });

      describe('safeTransferFrom(address,address,uint256,bytes)', function () {
        const method = 'safeTransferFrom(address,address,uint256,bytes)';
        it('reverts with a Fungible Token id', async function () {
          await expectRevert(this.token.methods[method](owner, other, fCollection1.id, '0x0', {from: owner}), revertMessages.NonOwnedNFT);
        });

        it('reverts with a Non-Fungible Collection id', async function () {
          await expectRevert(this.token.methods[method](owner, other, nfCollection, '0x0', {from: owner}), revertMessages.NonOwnedNFT);
        });
      });

      describe('batchTransferFrom(address,address,uint256[])', function () {
        if (batchTransferFrom_ERC721 === undefined) {
          return;
        }

        it('reverts with a Fungible Token id', async function () {
          await expectRevert(batchTransferFrom_ERC721(this.token, owner, other, [nft1, fCollection1.id], {from: owner}), revertMessages.NonOwnedNFT);
        });

        it('reverts with a Non-Fungible Collection id', async function () {
          await expectRevert(batchTransferFrom_ERC721(this.token, owner, other, [nft1, nfCollection], {from: owner}), revertMessages.NonOwnedNFT);
        });
      });
    });

    describe('ERC721 behaviours during ERC1155 transfers', function () {
      context('safeTransferFrom(address,address,uint256,uint256,bytes)', function () {
        const method = 'safeTransferFrom(address,address,uint256,uint256,bytes)';
        // it("reverts if `to` is the zero address", async function() {
        //     await expectRevert(
        //         safeTransferFrom(this.token, owner, ZeroAddress, nft1, 1, data, { from: owner }),
        //         revertMessages.TransferToZero
        //     );
        // });

        // it("reverts if `id` is a non-fungible collection", async function() {
        //     await expectRevert(
        //         safeTransferFrom(this.token, owner, other, nfCollection, 1, data, { from: owner }),
        //         revertMessages.NotTokenId
        //     );
        // });

        // context("when transferring a non-fungible token", function() {
        //     it("reverts if the sender is non-approved", async function() {
        //         await expectRevert(
        //             safeTransferFrom(this.token, owner, other, nft1, 1, data, { from: other }),
        //             revertMessages.NonApproved
        //         );
        //     });

        //     it("reverts if `value` is not 1", async function() {
        //         await expectRevert(
        //             safeTransferFrom(this.token, owner, other, nft1, 0, data, { from: owner }),
        //             revertMessages.WrongNFTValue
        //         );
        //     });

        //     it("reverts if `from` is not the owner of `id`", async function() {
        //         await expectRevert(
        //             safeTransferFrom(this.token, other, owner, nft1, 1, data, { from: other }),
        //             revertMessages.NonOwnedNFT
        //         );
        //     });

        it('does not emit a Transfer event for a fungible transfer', async function () {
          const receipt = await this.token.methods[method](owner, other, fCollection1.id, One, data, {
            from: owner,
          });

          expectEvent.notEmitted(receipt, 'Transfer');
          // let present = false;
          // try {
          //     present = true;
          // } catch (e) {}

          // present.should.be.false;
        });

        context('when successful', function () {
          const transferFrom = function (from) {
            beforeEach(async function () {
              this.nftBalanceOwner = await this.token.balanceOf(owner, nft1);
              this.nftBalanceToWhom = await this.token.balanceOf(this.toWhom, nft1);
              // this.balanceOwner = await this.token.balanceOf(owner, nfCollection);
              // this.balanceToWhom = await this.token.balanceOf(this.toWhom, nfCollection);
              this.receipt = await this.token.methods[method](owner, this.toWhom, nft1, 1, data, {
                from: from,
              });
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

            // it("should increase the non-fungible collection balance of the new owner", async function() {
            //     (await this.token.balanceOf(this.toWhom, nfCollection)).should.be.bignumber.equal(
            //         this.balanceToWhom.addn(1)
            //     );
            // });

            // it("should decrease the non-fungible collection balance of the previous owner", async function() {
            //     (await this.token.balanceOf(owner, nfCollection)).should.be.bignumber.equal(
            //         this.balanceOwner.subn(1)
            //     );
            // });

            it('should emit the Transfer event', async function () {
              expectEvent(this.receipt, 'Transfer', {
                _from: owner,
                _to: this.toWhom,
                _tokenId: nft1,
              });
            });

            // TODO NFTs approval clearing

            // it("should emit the TransferSingle event", async function() {
            //     expectEvent(this.receipt, "TransferSingle", {
            //         _operator: from,
            //         _from: owner,
            //         _to: this.toWhom,
            //         _id: nft1,
            //         _value: "1"
            //     });
            // });
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
                await this.token.setApprovalForAll(operator, true, {from: owner});
              });

              transferFrom(operator);
            });

            context('when called by an approved sender', function () {
              beforeEach(async function () {
                await this.token.approve(approved, nft1, {from: owner});
              });

              transferFrom(approved);
            });
          });

          // context("transferred to an ERC1155TokenReceiver contract", function() {
          //     beforeEach(async function() {
          //         this.toWhom = this.receiver.address;
          //     });

          //     const transferFromToReceiver = function(from) {
          //         transferFrom(from);

          //         it("should safely receive", async function() {
          //             await expectEvent.inTransaction(this.receipt.tx, this.receiver, "ReceivedSingle", {
          //                 operator: from,
          //                 from: owner,
          //                 id: nft1,
          //                 value: 1,
          //                 data: data
          //             });
          //         });
          //     };

          //     context("when called by the owner", function() {
          //         transferFromToReceiver(owner);
          //     });

          //     context("when called by an operator", function() {
          //         beforeEach(async function() {
          //             await this.token.setApprovalForAll(operator, true, { from: owner });
          //         });

          //         transferFromToReceiver(operator);
          //     });

          //     context("when called by an approved sender", function() {
          //         beforeEach(async function() {
          //             await this.token.approve(approved, nft1, { from: owner });
          //         });

          //         transferFrom(approved);
          //     });
          // });
        });
      });

      context('safeBatchTransferFrom(address,address,uint256[],uint256[],bytes)', function () {
        const method = 'safeBatchTransferFrom(address,address,uint256[],uint256[],bytes)';
        // it("reverts if `ids` and `values` have inconsistent lengths", async function() {
        //     await expectRevert(
        //         safeBatchTransferFrom(this.token, owner, other, [nft1, fCollection1.id], [1], data, {
        //             from: owner
        //         }),
        //         revertMessages.InconsistentArrays
        //     );
        // });

        // it("reverts if `to` is the zero address", async function() {
        //     await expectRevert(
        //         safeBatchTransferFrom(this.token, owner, ZeroAddress, [nft1, fCollection1.id], [1, 1], data, {
        //             from: owner
        //         }),
        //         revertMessages.TransferToZero
        //     );
        // });

        // it("reverts if the sender is non-approved", async function() {
        //     await expectRevert(
        //         safeBatchTransferFrom(this.token, owner, other, [nft1, fCollection1.id], [1, 1], data, {
        //             from: other
        //         }),
        //         revertMessages.NonApproved
        //     );
        // });

        // it("reverts if one of `ids` is a non-fungible collection", async function() {
        //     await expectRevert(
        //         safeBatchTransferFrom(
        //             this.token,
        //             owner,
        //             other,
        //             [nft1, nfCollection, fCollection1.id],
        //             [1, 1, 1],
        //             data,
        //             { from: owner }
        //         ),
        //         revertMessages.NotTokenId
        //     );
        // });

        // it("reverts if one of `ids` is a non-fungible token and its paired `value` is not 1", async function() {
        //     await expectRevert(
        //         safeBatchTransferFrom(this.token, owner, other, [nft1, fCollection1.id], [0, 1], data, {
        //             from: owner
        //         }),
        //         revertMessages.WrongNFTValue
        //     );
        // });

        // it("reverts if one of `ids` is a non-fungible token and is not owned by `from`", async function() {
        //     await expectRevert(
        //         safeBatchTransferFrom(this.token, other, owner, [nft1], [1], data, { from: owner }),
        //         revertMessages.NonOwnedNFT
        //     );
        // });

        // it("reverts if one of `ids` is a fungible token and its paired `value` is 0", async function() {
        //     await expectRevert(
        //         safeBatchTransferFrom(this.token, owner, other, [nft1, fCollection1.id], [1, 0], data, {
        //             from: owner
        //         }),
        //         revertMessages.ZeroValue
        //     );
        // });

        // it("reverts if one of `ids` is a fungible token and `from` has an insufficient balance", async function() {
        //     await expectRevert(
        //         safeBatchTransferFrom(
        //             this.token,
        //             owner,
        //             other,
        //             [nft1, fCollection1.id],
        //             [1, fCollection1.supply + 1],
        //             data,
        //             { from: owner }
        //         ),
        //         revertMessages.InsufficientBalance
        //     );
        // });

        it('does not emit a Transfer event for a fungible transfer', async function () {
          const ids = [fCollection1.id, fCollection2.id];
          const values = [One, One];
          const receipt = await this.token.methods[method](owner, other, ids, values, data, {from: owner});

          expectEvent.notEmitted(receipt, 'Transfer');

          // let present = false;
          // try {
          //     expectEvent(receipt, "Transfer", {
          //         _from: owner,
          //         _to: other
          //     });
          //     present = true;
          // } catch (e) {}

          // present.should.be.false;
        });

        context('when successful', function () {
          const batch = [
            {
              id: nft3,
              value: 1,
              nfCollection: nfCollection2,
              isFungible: false,
            },
            {
              id: fCollection1.id,
              value: 2,
              nfCollection: null,
              isFungible: true,
            },
            {
              id: nft1,
              value: 1,
              nfCollection: nfCollection,
              isFungible: false,
            },
            {
              id: nft2,
              value: 1,
              nfCollection: nfCollection2,
              isFungible: false,
            },
            {
              id: fCollection2.id,
              value: 5,
              nfCollection: null,
              isFungible: true,
            },
          ];

          const batchTransferFrom = (from, approvedSender = false) => {
            beforeEach(async function () {
              this.nftBalanceOwner = [];
              this.nftBalanceToWhom = [];
              this.nfCollectionBalanceOwner = [];
              this.nfCollectionBalanceToWhom = [];
              this.fCollectionBalanceOwner = [];
              this.fCollectionBalanceToWhom = [];
              this.nfCollectionSupply = {};
              this.fCollectionSupply = {};

              for (const item of batch) {
                if (item.isFungible) {
                  if (!approvedSender) {
                    this.fCollectionBalanceOwner.push(await this.token.balanceOf(owner, item.id));
                    this.fCollectionBalanceToWhom.push(await this.token.balanceOf(this.toWhom, item.id));

                    if (this.fCollectionSupply[item.id] == undefined) {
                      this.fCollectionSupply[item.id] = item.value;
                    } else {
                      this.fCollectionSupply[item.id] += item.value;
                    }
                  }
                } else {
                  this.nftBalanceOwner.push(await this.token.balanceOf(owner, item.id));
                  this.nftBalanceToWhom.push(await this.token.balanceOf(this.toWhom, item.id));
                  this.nfCollectionBalanceOwner.push(await this.token.balanceOf(owner, item.nfCollection));
                  this.nfCollectionBalanceToWhom.push(await this.token.balanceOf(this.toWhom, item.nfCollection));

                  if (this.nfCollectionSupply[item.nfCollection] == undefined) {
                    this.nfCollectionSupply[item.nfCollection] = 1;
                  } else {
                    this.nfCollectionSupply[item.nfCollection] += 1;
                  }
                }
              }

              this.tokens = batch.filter((item) => !item.isFungible || !approvedSender).map((item) => item.id);

              this.values = batch.filter((item) => !item.isFungible || !approvedSender).map((item) => item.value);

              this.receipt = await this.token.methods[method](owner, this.toWhom, this.tokens, this.values, data, {
                from: from,
              });
            });

            // it("should transfer the non-fungible tokens to the new owner", async function() {
            //     for (const item of batch) {
            //         if (!item.isFungible) {
            //             const newOwner = await this.token.ownerOf(item.id);
            //             newOwner.should.not.equal(owner);
            //             newOwner.should.equal(this.toWhom);
            //         }
            //     }
            // });

            it('should increase the non-fungible token balance of the new owner', async function () {
              let index = 0;
              for (const item of batch) {
                if (!item.isFungible) {
                  (await this.token.balanceOf(this.toWhom, item.id)).should.be.bignumber.equal(this.nftBalanceToWhom[index++].addn(1));
                }
              }
            });

            it('should decrease the non-fungible token balance of the previous owner', async function () {
              let index = 0;
              for (const item of batch) {
                if (!item.isFungible) {
                  (await this.token.balanceOf(owner, item.id)).should.be.bignumber.equal(this.nftBalanceOwner[index++].subn(1));
                }
              }
            });

            // it("should increase the non-fungible collection balance of the new owner", async function() {
            //     let index = 0;
            //     for (const item of batch) {
            //         if (!item.isFungible) {
            //             (await this.token.balanceOf(this.toWhom, item.nfCollection)).should.be.bignumber.equal(
            //                 this.nfCollectionBalanceToWhom[index++].addn(
            //                     this.nfCollectionSupply[item.nfCollection]
            //                 )
            //             );
            //         }
            //     }
            // });

            // it("should decrease the non-fungible collection balance of the previous owner", async function() {
            //     let index = 0;
            //     for (const item of batch) {
            //         if (!item.isFungible) {
            //             (await this.token.balanceOf(owner, item.nfCollection)).should.be.bignumber.equal(
            //                 this.nfCollectionBalanceOwner[index++].subn(
            //                     this.nfCollectionSupply[item.nfCollection]
            //                 )
            //             );
            //         }
            //     }
            // });

            // it("should decrease the fungible token balance of the previous owner", async function() {
            //     let index = 0;
            //     for (const item of batch) {
            //         if (item.isFungible && !approvedSender) {
            //             (await this.token.balanceOf(this.toWhom, item.id)).should.be.bignumber.equal(
            //                 this.fCollectionBalanceToWhom[index++].addn(this.fCollectionSupply[item.id])
            //             );
            //         }
            //     }
            // });

            // it("should increase the fungible token balance of the new owner", async function() {
            //     let index = 0;
            //     for (const item of batch) {
            //         if (item.isFungible && !approvedSender) {
            //             (await this.token.balanceOf(owner, item.id)).should.be.bignumber.equal(
            //                 this.fCollectionBalanceOwner[index++].subn(this.fCollectionSupply[item.id])
            //             );
            //         }
            //     }
            // });

            it('should emit the Transfer events', async function () {
              for (const item of batch) {
                if (!item.isFungible) {
                  expectEvent(this.receipt, 'Transfer', {
                    _from: owner,
                    _to: this.toWhom,
                    _tokenId: item.id,
                  });
                }
              }
            });

            // TODO NFTs approval clearing

            // it("should emit the TransferBatch event", async function() {
            //     expectEvent(this.receipt, "TransferBatch", {
            //         _operator: from,
            //         _from: owner,
            //         _to: this.toWhom,
            //         _ids: this.tokens,
            //         _values: this.values
            //     });
            // });
          };

          context('transferred to a user account', function () {
            beforeEach(async function () {
              this.toWhom = other;
            });

            context('when called by the owner', function () {
              batchTransferFrom(owner);
            });

            context('when called by an operator', function () {
              beforeEach(async function () {
                await this.token.setApprovalForAll(operator, true, {from: owner});
              });

              batchTransferFrom(operator);
            });

            context('when called by an approved sender', function () {
              beforeEach(async function () {
                for (const item of batch) {
                  if (!item.isFungible) {
                    await this.token.approve(approved, item.id, {from: owner});
                  }
                }
              });

              batchTransferFrom(approved, true);
            });
          });

          context('transferred to an ERC721 receiver contract', function () {
            it('should revert', async function () {
              await expectRevert.unspecified(
                this.token.methods[method](owner, this.receiver721.address, [nft1], [1], '0x0', {
                  from: owner,
                })
              );
            });
          });

          context('transferred to an ERC1155TokenReceiver contract', function () {
            beforeEach(async function () {
              this.toWhom = this.receiver.address;
            });

            const batchTransferFromToReceiver = function (from, approvedSender = false) {
              batchTransferFrom(from, approvedSender);

              it('should safely receive', async function () {
                await expectEvent.inTransaction(this.receipt.tx, this.receiver, 'ReceivedBatch', {
                  operator: from,
                  from: owner,
                  ids: this.tokens,
                  values: this.values,
                  data: data,
                });
              });
            };

            context('when called by the owner', function () {
              batchTransferFromToReceiver(owner);
            });

            context('when called by an operator', function () {
              beforeEach(async function () {
                await this.token.setApprovalForAll(operator, true, {from: owner});
              });

              batchTransferFromToReceiver(operator);
            });

            context('when called by an approved sender', function () {
              beforeEach(async function () {
                for (const item of batch) {
                  if (!item.isFungible) {
                    await this.token.approve(approved, item.id, {from: owner});
                  }
                }
              });

              batchTransferFromToReceiver(approved, true);
            });
          });
        });
      });
    });

    describe('ERC1155 behaviours during ERC721 transfers', function () {
      context('transferFrom', function () {
        // it('reverts if `to` is the zero address', async function () {
        //   await expectRevert(
        //     transferFrom_ERC721(this.token, owner, ZeroAddress, nft1, {from: owner}),
        //     revertMessages.TransferToZero
        //   );
        // });

        // it('reverts if the sender is not approved', async function () {
        //   await expectRevert(
        //     transferFrom_ERC721(this.token, owner, other, nft1, {from: other}),
        //     revertMessages.NonApproved
        //   );
        // });

        // it('reverts if `nftId` is not owned by `from`', async function () {
        //   await expectRevert(
        //     transferFrom_ERC721(this.token, other, owner, nft1, {from: owner}),
        //     revertMessages.NonOwnedNFT
        //   );
        // });

        context('when successful', function () {
          const transferFrom = function (from) {
            beforeEach(async function () {
              //   this.nftBalanceOwner = await this.token.balanceOf(owner, nft1);
              //   this.nftBalanceToWhom = await this.token.balanceOf(this.toWhom, nft1);
              this.balanceOwner = await this.token.balanceOf(owner, nfCollection);
              this.balanceToWhom = await this.token.balanceOf(this.toWhom, nfCollection);
              this.receipt = await this.token.transferFrom(owner, this.toWhom, nft1, {
                from: from,
              });
            });

            // it('should transfer the token to the new owner', async function () {
            //   const newOwner = await this.token.ownerOf(nft1);
            //   newOwner.should.not.equal(owner);
            //   newOwner.should.equal(this.toWhom);
            // });

            // it('should increase the non-fungible token balance of the new owner', async function () {
            //   (await this.token.balanceOf(this.toWhom, nft1)).should.be.bignumber.equal(this.nftBalanceToWhom.addn(1));
            // });

            // it('should decrease the non-fungible token balance of the previous owner', async function () {
            //   (await this.token.balanceOf(owner, nft1)).should.be.bignumber.equal(this.nftBalanceOwner.subn(1));
            // });

            it('should increase the non-fungible collection balance of the new owner', async function () {
              (await this.token.balanceOf(this.toWhom, nfCollection)).should.be.bignumber.equal(this.balanceToWhom.addn(1));
            });

            it('should decrease the non-fungible collection balance of the previous owner', async function () {
              (await this.token.balanceOf(owner, nfCollection)).should.be.bignumber.equal(this.balanceOwner.subn(1));
            });

            // it('should emit the Transfer event', async function () {
            //   expectEvent(
            //     this.receipt,
            //     'Transfer',
            //     {
            //       _from: owner,
            //       _to: this.toWhom,
            //       _tokenId: nft1
            //     }
            //   );
            // });

            it('should emit a TransferSingle event', async function () {
              expectEvent(this.receipt, 'TransferSingle', {
                _operator: from,
                _from: owner,
                _to: this.toWhom,
                _id: nft1,
                _value: '1',
              });
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
                await this.token.setApprovalForAll(operator, true, {from: owner});
              });

              transferFrom(operator);
            });

            context('when called by an approved sender', function () {
              beforeEach(async function () {
                await this.token.approve(approved, nft1, {from: owner});
              });

              transferFrom(approved);
            });
          });

          context('transferred to an ERC1155TokenReceiver receiver contract', function () {
            beforeEach(async function () {
              this.toWhom = this.receiver.address;
            });

            const transferFromToReceiver = function (from) {
              transferFrom(from);

              it('should safely receive', async function () {
                await expectEvent.inTransaction(this.receipt.tx, this.receiver, 'ReceivedSingle', {
                  operator: from,
                  from: owner,
                  id: nft1,
                  value: 1,
                  data: null,
                });
              });
            };

            context('when called by the owner', function () {
              transferFromToReceiver(owner);
            });

            context('when called by an operator', function () {
              beforeEach(async function () {
                await this.token.setApprovalForAll(operator, true, {from: owner});
              });

              transferFromToReceiver(operator);
            });

            context('when called by an approved sender', function () {
              beforeEach(async function () {
                await this.token.approve(approved, nft1, {from: owner});
              });

              transferFrom(approved);
            });
          });

          //   context('transferred to an ERC-721 receiver contract', function () {
          //     beforeEach(async function () {
          //       this.toWhom = this.receiver721.address;
          //     })

          //     const transferFromToReceiver = function (from) {
          //       transferFrom(from);

          //       it('should NOT safely receive', async function () {
          //         await expectEvent.notEmitted.inTransaction(
          //           this.receipt.tx,
          //           this.receiver721,
          //           'Received'
          //         );
          //       });
          //     };

          //     context('when called by the owner', function () {
          //       transferFromToReceiver(owner);
          //     });

          //     context('when called by an operator', function () {
          //       beforeEach(async function () {
          //         await this.token.setApprovalForAll(operator, true, { from: owner });
          //       });

          //       transferFromToReceiver(operator);
          //     });

          //     context('when called by an approved sender', function () {
          //       beforeEach(async function () {
          //         await this.token.approve(approved, nft1, { from: owner });
          //       });

          //       transferFrom(approved);
          //     });
          //   });
        });
      });

      context('safeTransferFrom(address,address,uint256)', function () {
        const method = 'safeTransferFrom(address,address,uint256)';
        // it('reverts if `to` is the zero address', async function () {
        //   await expectRevert(
        //     safeTransferFrom_ERC721(this.token, owner, ZeroAddress, nft1, data, {from: owner}),
        //     revertMessages.TransferToZero
        //   );
        // });

        // it('reverts if the sender is not approved', async function () {
        //   await expectRevert(
        //     safeTransferFrom_ERC721(this.token, owner, other, nft1, data, {from: other}),
        //     revertMessages.NonApproved
        //   );
        // });

        // it('reverts if `nftId` is a fungible collection', async function () {
        //   await expectRevert(
        //     safeTransferFrom_ERC721(this.token, owner, other, fCollection1.id, data, {from: owner}),
        //     revertMessages.NotNFT
        //   );
        // });

        // it('reverts if `nftId` is a non-fungible collection', async function () {
        //   await expectRevert(
        //     safeTransferFrom_ERC721(this.token, owner, other, nfCollection, data, {from: owner}),
        //     revertMessages.NotNFT
        //   );
        // });

        // it('reverts if `nftId` is not owned by `from`', async function () {
        //   await expectRevert(
        //     safeTransferFrom_ERC721(this.token, other, owner, nft1, data, {from: owner}),
        //     revertMessages.NonOwnedNFT
        //   );
        // });

        context('when successful', function () {
          const transferFrom = function (from) {
            beforeEach(async function () {
              //   this.nftBalanceOwner = await this.token.balanceOf(owner, nft1);
              //   this.nftBalanceToWhom = await this.token.balanceOf(this.toWhom, nft1);
              this.balanceOwner = await this.token.balanceOf(owner, nfCollection);
              this.balanceToWhom = await this.token.balanceOf(this.toWhom, nfCollection);
              this.receipt = await this.token.methods[method](owner, this.toWhom, nft1, {
                from: from,
              });
            });

            // it('should transfer the token to the new owner', async function () {
            //   const newOwner = await this.token.ownerOf(nft1);
            //   newOwner.should.not.equal(owner);
            //   newOwner.should.equal(this.toWhom);
            // });

            // it('should increase the non-fungible token balance of the new owner', async function () {
            //   (await this.token.balanceOf(this.toWhom, nft1)).should.be.bignumber.equal(this.nftBalanceToWhom.addn(1));
            // });

            // it('should decrease the non-fungible token balance of the previous owner', async function () {
            //   (await this.token.balanceOf(owner, nft1)).should.be.bignumber.equal(this.nftBalanceOwner.subn(1));
            // });

            it('should increase the non-fungible collection balance of the new owner', async function () {
              (await this.token.balanceOf(this.toWhom, nfCollection)).should.be.bignumber.equal(this.balanceToWhom.addn(1));
            });

            it('should decrease the non-fungible collection balance of the previous owner', async function () {
              (await this.token.balanceOf(owner, nfCollection)).should.be.bignumber.equal(this.balanceOwner.subn(1));
            });

            // it('should emit the Transfer event', async function () {
            //   expectEvent(
            //     this.receipt,
            //     'Transfer',
            //     {
            //       _from: owner,
            //       _to: this.toWhom,
            //       _tokenId: nft1
            //     }
            //   );
            // });

            it('should emit the TransferSingle event', async function () {
              expectEvent(this.receipt, 'TransferSingle', {
                _operator: from,
                _from: owner,
                _to: this.toWhom,
                _id: nft1,
                _value: '1',
              });
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
                await this.token.setApprovalForAll(operator, true, {from: owner});
              });

              transferFrom(operator);
            });

            context('when called by an approved sender', function () {
              beforeEach(async function () {
                await this.token.approve(approved, nft1, {from: owner});
              });

              transferFrom(approved);
            });
          });

          context('transferred to an ERC1155TokenReceiver contract', function () {
            beforeEach(async function () {
              this.toWhom = this.receiver.address;
            });

            const transferFromToReceiver = function (from) {
              transferFrom(from);

              it('should safely receive', async function () {
                await expectEvent.inTransaction(this.receipt.tx, this.receiver, 'ReceivedSingle', {
                  operator: from,
                  from: owner,
                  id: nft1,
                  value: 1,
                  data: null,
                });
              });
            };

            context('when called by the owner', function () {
              transferFromToReceiver(owner);
            });

            context('when called by an operator', function () {
              beforeEach(async function () {
                await this.token.setApprovalForAll(operator, true, {from: owner});
              });

              transferFromToReceiver(operator);
            });

            context('when called by an approved sender', function () {
              beforeEach(async function () {
                await this.token.approve(approved, nft1, {from: owner});
              });

              transferFrom(approved);
            });
          });

          //   context('transferred to an ERC-721 receiver contract', function () {
          //     beforeEach(async function () {
          //       this.toWhom = this.receiver721.address;
          //     })

          //     const transferFromToReceiver = function (from) {
          //       transferFrom(from);

          //       it('should safely receive', async function () {
          //         await expectEvent.inTransaction(
          //           this.receipt.tx,
          //           this.receiver721,
          //           'Received',
          //           {
          //             operator: from,
          //             from: owner,
          //             tokenId: nft1,
          //             data: data,
          //           }
          //         );
          //       });
          //     };

          //     context('when called by the owner', function () {
          //       transferFromToReceiver(owner);
          //     });

          //     context('when called by an operator', function () {
          //       beforeEach(async function () {
          //         await this.token.setApprovalForAll(operator, true, { from: owner });
          //       });

          //       transferFromToReceiver(operator);
          //     });

          //     context('when called by an approved sender', function () {
          //       beforeEach(async function () {
          //         await this.token.approve(approved, nft1, { from: owner });
          //       });

          //       transferFrom(approved);
          //     });
          //   });
        });
      });

      context('safeTransferFrom(address,address,uint256,bytes)', function () {
        const method = 'safeTransferFrom(address,address,uint256,bytes)';
        // it('reverts if `to` is the zero address', async function () {
        //   await expectRevert(
        //     safeTransferFrom_ERC721(this.token, owner, ZeroAddress, nft1, data, {from: owner}),
        //     revertMessages.TransferToZero
        //   );
        // });

        // it('reverts if the sender is not approved', async function () {
        //   await expectRevert(
        //     safeTransferFrom_ERC721(this.token, owner, other, nft1, data, {from: other}),
        //     revertMessages.NonApproved
        //   );
        // });

        // it('reverts if `nftId` is a fungible collection', async function () {
        //   await expectRevert(
        //     safeTransferFrom_ERC721(this.token, owner, other, fCollection1.id, data, {from: owner}),
        //     revertMessages.NotNFT
        //   );
        // });

        // it('reverts if `nftId` is a non-fungible collection', async function () {
        //   await expectRevert(
        //     safeTransferFrom_ERC721(this.token, owner, other, nfCollection, data, {from: owner}),
        //     revertMessages.NotNFT
        //   );
        // });

        // it('reverts if `nftId` is not owned by `from`', async function () {
        //   await expectRevert(
        //     safeTransferFrom_ERC721(this.token, other, owner, nft1, data, {from: owner}),
        //     revertMessages.NonOwnedNFT
        //   );
        // });

        context('when successful', function () {
          const transferFrom = function (from) {
            beforeEach(async function () {
              //   this.nftBalanceOwner = await this.token.balanceOf(owner, nft1);
              //   this.nftBalanceToWhom = await this.token.balanceOf(this.toWhom, nft1);
              this.balanceOwner = await this.token.balanceOf(owner, nfCollection);
              this.balanceToWhom = await this.token.balanceOf(this.toWhom, nfCollection);
              this.receipt = await this.token.methods[method](owner, this.toWhom, nft1, data, {
                from: from,
              });
            });

            // it('should transfer the token to the new owner', async function () {
            //   const newOwner = await this.token.ownerOf(nft1);
            //   newOwner.should.not.equal(owner);
            //   newOwner.should.equal(this.toWhom);
            // });

            // it('should increase the non-fungible token balance of the new owner', async function () {
            //   (await this.token.balanceOf(this.toWhom, nft1)).should.be.bignumber.equal(this.nftBalanceToWhom.addn(1));
            // });

            // it('should decrease the non-fungible token balance of the previous owner', async function () {
            //   (await this.token.balanceOf(owner, nft1)).should.be.bignumber.equal(this.nftBalanceOwner.subn(1));
            // });

            it('should increase the non-fungible collection balance of the new owner', async function () {
              (await this.token.balanceOf(this.toWhom, nfCollection)).should.be.bignumber.equal(this.balanceToWhom.addn(1));
            });

            it('should decrease the non-fungible collection balance of the previous owner', async function () {
              (await this.token.balanceOf(owner, nfCollection)).should.be.bignumber.equal(this.balanceOwner.subn(1));
            });

            // it('should emit the Transfer event', async function () {
            //   expectEvent(
            //     this.receipt,
            //     'Transfer',
            //     {
            //       _from: owner,
            //       _to: this.toWhom,
            //       _tokenId: nft1
            //     }
            //   );
            // });

            it('should emit the TransferSingle event', async function () {
              expectEvent(this.receipt, 'TransferSingle', {
                _operator: from,
                _from: owner,
                _to: this.toWhom,
                _id: nft1,
                _value: '1',
              });
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
                await this.token.setApprovalForAll(operator, true, {from: owner});
              });

              transferFrom(operator);
            });

            context('when called by an approved sender', function () {
              beforeEach(async function () {
                await this.token.approve(approved, nft1, {from: owner});
              });

              transferFrom(approved);
            });
          });

          context('transferred to an ERC1155TokenReceiver contract', function () {
            beforeEach(async function () {
              this.toWhom = this.receiver.address;
            });

            const transferFromToReceiver = function (from) {
              transferFrom(from);

              it('should safely receive', async function () {
                await expectEvent.inTransaction(this.receipt.tx, this.receiver, 'ReceivedSingle', {
                  operator: from,
                  from: owner,
                  id: nft1,
                  value: 1,
                  data,
                });
              });
            };

            context('when called by the owner', function () {
              transferFromToReceiver(owner);
            });

            context('when called by an operator', function () {
              beforeEach(async function () {
                await this.token.setApprovalForAll(operator, true, {from: owner});
              });

              transferFromToReceiver(operator);
            });

            context('when called by an approved sender', function () {
              beforeEach(async function () {
                await this.token.approve(approved, nft1, {from: owner});
              });

              transferFrom(approved);
            });
          });

          //   context('transferred to an ERC-721 receiver contract', function () {
          //     beforeEach(async function () {
          //       this.toWhom = this.receiver721.address;
          //     })

          //     const transferFromToReceiver = function (from) {
          //       transferFrom(from);

          //       it('should safely receive', async function () {
          //         await expectEvent.inTransaction(
          //           this.receipt.tx,
          //           this.receiver721,
          //           'Received',
          //           {
          //             operator: from,
          //             from: owner,
          //             tokenId: nft1,
          //             data: data,
          //           }
          //         );
          //       });
          //     };

          //     context('when called by the owner', function () {
          //       transferFromToReceiver(owner);
          //     });

          //     context('when called by an operator', function () {
          //       beforeEach(async function () {
          //         await this.token.setApprovalForAll(operator, true, { from: owner });
          //       });

          //       transferFromToReceiver(operator);
          //     });

          //     context('when called by an approved sender', function () {
          //       beforeEach(async function () {
          //         await this.token.approve(approved, nft1, { from: owner });
          //       });

          //       transferFrom(approved);
          //     });
          //   });
        });
      });

      context('batchTransferFrom(address,uint256[])', function () {
        if (batchTransferFrom_ERC721 === undefined) {
          return;
        }
        // it("reverts if `to` is the zero address", async function() {
        //     await expectRevert(
        //         batchTransferFrom_ERC721(this.token, owner, ZeroAddress, [nft1], { from: owner }),
        //         revertMessages.TransferToZero
        //     );
        // });

        // it("reverts if the sender is not approved", async function() {
        //     await expectRevert(
        //         batchTransferFrom_ERC721(this.token, owner, other, [nft1], { from: other }),
        //         revertMessages.NonApproved
        //     );
        // });

        // it("reverts if one of `nftId` is a fungible collection", async function() {
        //     await expectRevert(
        //         batchTransferFrom_ERC721(this.token, owner, other, [nft1, fCollection1.id], { from: owner }),
        //         revertMessages.NotNFT
        //     );
        // });

        // it("reverts if one of `nftId` is a non-fungible collection", async function() {
        //     await expectRevert(
        //         batchTransferFrom_ERC721(this.token, owner, other, [nft1, nfCollection], { from: owner }),
        //         revertMessages.NotNFT
        //     );
        // });

        // it("reverts if one of `nftId` is not owned by `from`", async function() {
        //     await expectRevert(
        //         batchTransferFrom_ERC721(this.token, other, owner, [nft1], { from: owner }),
        //         revertMessages.NonOwnedNFT
        //     );
        // });

        context('when successful', function () {
          const collection1Nfts = [nft1];
          const collection2Nfts = [nft2, nft3];
          const nfts = collection1Nfts.concat(collection2Nfts);

          const batchTransferFrom = function (from) {
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
              this.receipt = await batchTransferFrom_ERC721(this.token, owner, this.toWhom, nfts, {
                from: from,
              });
            });

            // it("should transfer the tokens to the new owner", async function() {
            //     for (const nft of nfts) {
            //         const newOwner = await this.token.ownerOf(nft);
            //         newOwner.should.not.equal(owner);
            //         newOwner.should.equal(this.toWhom);
            //     }
            // });

            // it("should increase the non-fungible token balance of the new owner", async function() {
            //     for (let index = 0; index != nfts.length; ++index) {
            //         const nft = nfts[index];
            //         (await this.token.balanceOf(this.toWhom, nft)).should.be.bignumber.equal(
            //             this.nftBalanceToWhom[index].addn(1)
            //         );
            //     }
            // });

            // it("should decrease the non-fungible token balance of the previous owner", async function() {
            //     for (let index = 0; index != nfts.length; ++index) {
            //         const nft = nfts[index];
            //         (await this.token.balanceOf(owner, nft)).should.be.bignumber.equal(
            //             this.nftBalanceOwner[index].subn(1)
            //         );
            //     }
            // });

            it('should increase the non-fungible collection balance of the new owner', async function () {
              (await this.token.balanceOf(this.toWhom, nfCollection)).should.be.bignumber.equal(
                this.collection1BalanceToWhom.addn(collection1Nfts.length)
              );
              (await this.token.balanceOf(this.toWhom, nfCollection2)).should.be.bignumber.equal(
                this.collection2BalanceToWhom.addn(collection2Nfts.length)
              );
            });

            it('should decrease the non-fungible collection balance of the previous owner', async function () {
              (await this.token.balanceOf(owner, nfCollection)).should.be.bignumber.equal(this.collection1BalanceOwner.subn(collection1Nfts.length));
              (await this.token.balanceOf(owner, nfCollection2)).should.be.bignumber.equal(this.collection2BalanceOwner.subn(collection2Nfts.length));
            });

            it('should emit the TransferBatch event', async function () {
              expectEvent(this.receipt, 'TransferBatch', {
                _operator: from,
                _from: owner,
                _to: this.toWhom,
                _ids: nfts,
                _values: Array(nfts.length).fill(1),
              });
            });
          };

          context('transferred to a user account', function () {
            beforeEach(async function () {
              this.toWhom = other;
            });

            context('when called by the owner', function () {
              batchTransferFrom(owner);
            });

            context('when called by an operator', function () {
              beforeEach(async function () {
                await this.token.setApprovalForAll(operator, true, {from: owner});
              });

              batchTransferFrom(operator);
            });

            context('when called by an approved sender', function () {
              beforeEach(async function () {
                for (const nft of nfts) {
                  await this.token.approve(approved, nft, {from: owner});
                }
              });

              batchTransferFrom(approved);
            });
          });

          context('transferred to an ERC1155TokenReceiver contract', function () {
            beforeEach(async function () {
              this.toWhom = this.receiver.address;
            });

            const batchTransferFromToReceiver = function (from) {
              batchTransferFrom(from);

              it('should safely receive', async function () {
                await expectEvent.inTransaction(this.receipt.tx, this.receiver, 'ReceivedBatch', {
                  operator: from,
                  from: owner,
                  ids: nfts,
                  values: Array(nfts.length).fill(1),
                  data: null,
                });
              });
            };

            context('when called by the owner', function () {
              batchTransferFromToReceiver(owner);
            });

            context('when called by an operator', function () {
              beforeEach(async function () {
                await this.token.setApprovalForAll(operator, true, {from: owner});
              });

              batchTransferFromToReceiver(operator);
            });

            context('when called by an approved sender', function () {
              beforeEach(async function () {
                for (const nft of nfts) {
                  await this.token.approve(approved, nft, {from: owner});
                }
              });

              batchTransferFromToReceiver(approved);
            });
          });
        });
      });
    });

    // context("when transferring a fungible token", function() {
    //     it("reverts if the sender is non-approved", async function() {
    //         await expectRevert(
    //             safeTransferFrom(this.token, owner, other, fCollection1.id, 1, data, { from: other }),
    //             revertMessages.NonApproved
    //         );
    //     });

    //     it("reverts if `value` is zero", async function() {
    //         await expectRevert(
    //             safeTransferFrom(this.token, owner, other, fCollection1.id, 0, data, { from: owner }),
    //             revertMessages.ZeroValue
    //         );
    //     });

    //     it("reverts if `from` has an insufficient balance", async function() {
    //         await expectRevert(
    //             safeTransferFrom(this.token, other, owner, fCollection1.id, 1, data, { from: other }),
    //             revertMessages.InsufficientBalance
    //         );
    //     });

    //     context("when successful", function() {
    //         const transferFrom = function(from) {
    //             beforeEach(async function() {
    //                 this.balanceOwner = await this.token.balanceOf(owner, fCollection1.id);
    //                 this.balanceToWhom = await this.token.balanceOf(this.toWhom, fCollection1.id);
    //                 this.receipt = await safeTransferFrom(
    //                     this.token,
    //                     owner,
    //                     this.toWhom,
    //                     fCollection1.id,
    //                     1,
    //                     data,
    //                     { from: from }
    //                 );
    //             });

    //             it("should increase the fungible collection balance of the new owner", async function() {
    //                 (await this.token.balanceOf(this.toWhom, fCollection1.id)).should.be.bignumber.equal(
    //                     this.balanceToWhom.addn(1)
    //                 );
    //             });

    //             it("should decrease the fungible collection balance of the previous owner", async function() {
    //                 (await this.token.balanceOf(owner, fCollection1.id)).should.be.bignumber.equal(
    //                     this.balanceOwner.subn(1)
    //                 );
    //             });

    //             it("emits the TransferSingle event", async function() {
    //                 expectEvent(this.receipt, "TransferSingle", {
    //                     _operator: from,
    //                     _from: owner,
    //                     _to: this.toWhom,
    //                     _id: fCollection1.id,
    //                     _value: "1"
    //                 });
    //             });
    //         };

    //         context("transferred to a user account", function() {
    //             beforeEach(async function() {
    //                 this.toWhom = other;
    //             });

    //             context("when called by the owner", function() {
    //                 transferFrom(owner);
    //             });

    //             context("when called by an operator", function() {
    //                 beforeEach(async function() {
    //                     await this.token.setApprovalForAll(operator, true, { from: owner });
    //                 });

    //                 transferFrom(operator);
    //             });
    //         });

    //         context("transferred to an ERC1155TokenReceiver contract", function() {
    //             beforeEach(async function() {
    //                 this.toWhom = this.receiver.address;
    //             });

    //             const transferFromToReceiver = function(from) {
    //                 transferFrom(from);

    //                 it("should safely receive", async function() {
    //                     await expectEvent.inTransaction(this.receipt.tx, this.receiver, "ReceivedSingle", {
    //                         operator: from,
    //                         from: owner,
    //                         id: fCollection1.id,
    //                         value: 1,
    //                         data: data
    //                     });
    //                 });
    //             };

    //             context("when called by the owner", function() {
    //                 transferFromToReceiver(owner);
    //             });

    //             context("when called by an operator", function() {
    //                 beforeEach(async function() {
    //                     await this.token.setApprovalForAll(operator, true, { from: owner });
    //                 });

    //                 transferFromToReceiver(operator);
    //             });
    //         });
    //     });
    // });
    // });

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
  shouldBehaveLikeERC1155721StandardInventory,
};

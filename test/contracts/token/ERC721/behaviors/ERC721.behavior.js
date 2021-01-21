const {artifacts, accounts, web3} = require('hardhat');
const {createFixtureLoader} = require('@animoca/ethereum-contracts-core_library/test/utils/fixture');
const {expectEvent, expectRevert} = require('@openzeppelin/test-helpers');

const {behaviors, constants, interfaces} = require('@animoca/ethereum-contracts-core_library');
const {ZeroAddress} = constants;
const interfaces721 = require('../../../../../src/interfaces/ERC165/ERC721');

const {makeNonFungibleTokenId} = require('@animoca/blockchain-inventory_metadata').inventoryIds;

const ERC721ReceiverMock = artifacts.require('ERC721ReceiverMock');

function shouldBehaveLikeERC721({
  nfMaskLength,
  contractName,
  revertMessages,
  deploy,
  safeMint_ERC721,
  batchTransferFrom_ERC721,
}) {
  const [creator, owner, approved, anotherApproved, operator, other] = accounts;

  if (batchTransferFrom_ERC721 === undefined) {
    console.log(
      `ERC1155721StandardInventory: non-standard ERC721 method batchTransfer(address,uint256[]) is not supported by ${contractName}, associated tests will be skipped`
    );
  }

  const nft1 = makeNonFungibleTokenId(1, 1, nfMaskLength);
  const nft2 = makeNonFungibleTokenId(2, 1, nfMaskLength);
  const nft3 = makeNonFungibleTokenId(3, 1, nfMaskLength);
  const unknownNFT = makeNonFungibleTokenId(999, 1, nfMaskLength);

  describe('like an ERC721', function () {
    const fixtureLoader = createFixtureLoader(accounts, web3.eth.currentProvider);
    const fixture = async function () {
      this.token = await deploy(creator);
      await safeMint_ERC721(this.token, owner, nft1, '0x', {from: creator});
      await safeMint_ERC721(this.token, owner, nft2, '0x', {from: creator});
      await safeMint_ERC721(this.token, owner, nft3, '0x', {from: creator});
    };

    beforeEach(async function () {
      await fixtureLoader(fixture, this);
      this.toWhom = other; // default to anyone for toWhom in context-dependent tests
    });

    describe('balanceOf(address)', function () {
      context('when the given address owns some tokens', function () {
        it('returns the amount of tokens owned by the given address', async function () {
          (await this.token.balanceOf(owner)).should.be.bignumber.equal('3');
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

      it('reverts if the Non-Fungible Token does not exist', async function () {
        await expectRevert(this.token.ownerOf(unknownNFT), revertMessages.NonExistingNFT);
      });
    });

    // describe('totalSupply', function () {
    //   it('returns total token supply', async function () {
    //     (await this.token.totalSupply()).should.be.bignumber.equal('2');
    //   });
    // });

    describe('transfers', function () {
      const tokenId = nft1;
      const tokenIds = [nft1, nft3];
      const data = '0x42';

      let receipt = null;

      beforeEach(async function () {
        await this.token.approve(approved, nft1, {from: owner});
        await this.token.approve(approved, nft3, {from: owner});
        await this.token.setApprovalForAll(operator, true, {from: owner});
      });

      const transferWasSuccessful = function ({owner, tokenId}) {
        it('transfers the ownership of the given token ID to the given address', async function () {
          (await this.token.ownerOf(tokenId)).should.be.equal(this.toWhom);
        });

        it('clears the approval for the token ID', async function () {
          (await this.token.getApproved(tokenId)).should.be.equal(ZeroAddress);
        });

        it('emits a transfer event', function () {
          expectEvent(receipt, 'Transfer', {
            _from: owner,
            _to: this.toWhom,
            _tokenId: tokenId,
          });
        });

        it('adjusts owners balances', async function () {
          (await this.token.balanceOf(owner)).should.be.bignumber.equal('2');
        });

        it('adjusts recipient balances', async function () {
          (await this.token.balanceOf(this.toWhom)).should.be.bignumber.equal('1');
        });

        it('adjusts owners tokens by index', async function () {
          if (!this.token.tokenOfOwnerByIndex) return;

          (await this.token.tokenOfOwnerByIndex(this.toWhom, 0)).should.be.bignumber.equal(tokenId);

          (await this.token.tokenOfOwnerByIndex(owner, 0)).should.be.bignumber.not.equal(tokenId);
        });
      };

      const shouldTransferTokensByUsers = function (transferFunction) {
        context('when called by the owner', function () {
          beforeEach(async function () {
            receipt = await transferFunction.call(this, owner, this.toWhom, tokenId, {from: owner});
          });
          transferWasSuccessful({owner, tokenId, approved});
        });

        context('when called by the approved individual', function () {
          beforeEach(async function () {
            receipt = await transferFunction.call(this, owner, this.toWhom, tokenId, {from: approved});
          });
          transferWasSuccessful({owner, tokenId, approved});
        });

        context('when called by the operator', function () {
          beforeEach(async function () {
            receipt = await transferFunction.call(this, owner, this.toWhom, tokenId, {from: operator});
          });
          transferWasSuccessful({owner, tokenId, approved});
        });

        context('when called by the owner without an approved user', function () {
          beforeEach(async function () {
            await this.token.approve(ZeroAddress, tokenId, {from: owner});
            receipt = await transferFunction.call(this, owner, this.toWhom, tokenId, {from: operator});
          });
          transferWasSuccessful({owner, tokenId, approved: null});
        });

        context('when sent to the owner', function () {
          beforeEach(async function () {
            receipt = await transferFunction.call(this, owner, owner, tokenId, {from: owner});
          });

          it('keeps ownership of the token', async function () {
            (await this.token.ownerOf(tokenId)).should.be.equal(owner);
          });

          it('clears the approval for the token ID', async function () {
            (await this.token.getApproved(tokenId)).should.be.equal(ZeroAddress);
          });

          it('emits a Transfer event', function () {
            expectEvent(receipt, 'Transfer', {
              _from: owner,
              _to: owner,
              _tokenId: tokenId,
            });
          });

          it('keeps the owner balance', async function () {
            (await this.token.balanceOf(owner)).should.be.bignumber.equal('3');
          });

          it('keeps same tokens by index', async function () {
            if (!this.token.tokenOfOwnerByIndex) return;
            const tokensListed = await Promise.all([0, 1].map((i) => this.token.tokenOfOwnerByIndex(owner, i)));
            tokensListed.map((t) => t.toNumber()).should.have.members([nft1.toNumber(), nft1.toNumber()]);
          });
        });

        it('reverts if the address of the previous owner is incorrect', async function () {
          await expectRevert(
            transferFunction.call(this, other, other, tokenId, {from: owner}),
            revertMessages.NonOwnedNFT
          );
        });

        it('reverts if the sender is not authorized for the token id', async function () {
          await expectRevert(
            transferFunction.call(this, owner, other, tokenId, {from: other}),
            revertMessages.NonApproved
          );
        });

        it('reverts if the Non-Fungible Token does not exist', async function () {
          await expectRevert(
            transferFunction.call(this, owner, other, unknownNFT, {from: owner}),
            revertMessages.NonOwnedNFT
          );
        });

        it('reverts if transferred to the zero address', async function () {
          await expectRevert(
            transferFunction.call(this, owner, ZeroAddress, tokenId, {from: owner}),
            revertMessages.TransferToZero
          );
        });
      };

      describe('transferFrom(address,address,uint256)', function () {
        shouldTransferTokensByUsers(function (from, to, tokenId, opts) {
          return this.token.transferFrom(from, to, tokenId, opts);
        });
      });

      describe('batchTransferFrom(address,address,uint256[])', function () {
        if (batchTransferFrom_ERC721 === undefined) {
          return;
        }

        const multipleTransferWasSuccessful = function ({owner, tokenIds}) {
          it('transfers the ownership of the given token IDs to the given address', async function () {
            for (const tokenId of tokenIds) {
              (await this.token.ownerOf(tokenId)).should.be.equal(this.toWhom);
            }
          });

          it('clears the approval for the token ID', async function () {
            for (const tokenId of tokenIds) {
              (await this.token.getApproved(tokenId)).should.be.equal(ZeroAddress);
            }
          });

          it('emits a Transfer event', function () {
            for (const tokenId of tokenIds) {
              expectEvent(receipt, 'Transfer', {
                _from: owner,
                _to: this.toWhom,
                _tokenId: tokenId,
              });
            }
          });

          it('adjusts owners balances', async function () {
            (await this.token.balanceOf(owner)).should.be.bignumber.equal('1');
          });

          it('adjusts recipient balances', async function () {
            (await this.token.balanceOf(this.toWhom)).should.be.bignumber.equal('2');
          });

          it('adjusts owners tokens by index', async function () {
            if (!this.token.tokenOfOwnerByIndex) return;

            (await this.token.tokenOfOwnerByIndex(this.toWhom, 0)).should.be.bignumber.equal(tokenIds[0]);

            (await this.token.tokenOfOwnerByIndex(owner, 0)).should.be.bignumber.not.equal(tokenIds[0]);
          });
        };

        const shouldTransferMultipleTokensByUsers = function (transferFunction) {
          context('when called by the owner', function () {
            beforeEach(async function () {
              receipt = await transferFunction.call(this, owner, this.toWhom, tokenIds, {from: owner});
            });
            multipleTransferWasSuccessful({owner, tokenIds, approved});
          });

          context('when called by the approved individual', function () {
            beforeEach(async function () {
              receipt = await transferFunction.call(this, owner, this.toWhom, tokenIds, {from: approved});
            });
            multipleTransferWasSuccessful({owner, tokenIds, approved});
          });

          context('when called by the operator', function () {
            beforeEach(async function () {
              receipt = await transferFunction.call(this, owner, this.toWhom, tokenIds, {from: operator});
            });
            multipleTransferWasSuccessful({owner, tokenIds, approved});
          });

          context('when called by the owner without an approved user', function () {
            beforeEach(async function () {
              for (const tokenId of tokenIds) {
                await this.token.approve(ZeroAddress, tokenId, {from: owner});
              }
              receipt = await transferFunction.call(this, owner, this.toWhom, tokenIds, {from: operator});
            });
            multipleTransferWasSuccessful({owner, tokenIds, approved: null});
          });

          context('when sent to the owner', function () {
            beforeEach(async function () {
              receipt = await transferFunction.call(this, owner, owner, tokenIds, {from: owner});
            });

            it('keeps ownership of the token', async function () {
              for (const tokenId of tokenIds) {
                (await this.token.ownerOf(tokenId)).should.be.equal(owner);
              }
            });

            it('clears the approval for the token ID', async function () {
              for (const tokenId of tokenIds) {
                (await this.token.getApproved(tokenId)).should.be.equal(ZeroAddress);
              }
            });

            it('emits Transfer events', function () {
              for (const tokenId of tokenIds) {
                expectEvent(receipt, 'Transfer', {
                  _from: owner,
                  _to: owner,
                  _tokenId: tokenId,
                });
              }
            });

            it('keeps the owner balance', async function () {
              (await this.token.balanceOf(owner)).should.be.bignumber.equal('3');
            });

            it('keeps same tokens by index', async function () {
              if (!this.token.tokenOfOwnerByIndex) return;
              const tokensListed = await Promise.all([0, 1].map((i) => this.token.tokenOfOwnerByIndex(owner, i)));
              tokensListed.map((t) => t.toNumber()).should.have.members([nft1.toNumber(), nft1.toNumber()]);
            });
          });

          it('reverts if the address of the previous owner is incorrect', async function () {
            await expectRevert(
              transferFunction.call(this, other, other, tokenIds, {from: owner}),
              revertMessages.NonOwnedNFT
            );
          });

          it('reverts if the sender is not authorised', async function () {
            await expectRevert(
              transferFunction.call(this, owner, other, tokenIds, {from: other}),
              revertMessages.NonApproved
            );
          });

          it('reverts if the Non-Fungible Token does not exist', async function () {
            await expectRevert(
              transferFunction.call(this, owner, other, [nft1, unknownNFT], {from: owner}),
              revertMessages.NonOwnedNFT
            );
          });

          it('reverts if transferred to the zero address', async function () {
            await expectRevert(
              transferFunction.call(this, owner, ZeroAddress, tokenIds, {from: owner}),
              revertMessages.TransferToZero
            );
          });
        };

        shouldTransferMultipleTokensByUsers(function (from, to, tokenIds, opts) {
          return batchTransferFrom_ERC721(this.token, from, to, tokenIds, opts);
        });
      });

      describe('safeTransferFrom', function () {
        const safeTransferFromWithData = function (from, to, tokenId, opts) {
          return this.token.methods['safeTransferFrom(address,address,uint256,bytes)'](from, to, tokenId, data, opts);
        };

        const safeTransferFromWithoutData = function (from, to, tokenId, opts) {
          return this.token.methods['safeTransferFrom(address,address,uint256)'](from, to, tokenId, opts);
        };

        const shouldTransferSafely = function (transferFun, data) {
          describe('to a user account', function () {
            shouldTransferTokensByUsers(transferFun);
          });

          describe('to a valid receiver contract', function () {
            beforeEach(async function () {
              this.receiver = await ERC721ReceiverMock.new(true);
              this.toWhom = this.receiver.address;
            });

            shouldTransferTokensByUsers(transferFun);

            it('should call onERC721Received', async function () {
              receipt = await transferFun.call(this, owner, this.receiver.address, tokenId, {from: owner});

              await expectEvent.inTransaction(receipt.tx, ERC721ReceiverMock, 'Received', {
                operator: owner,
                from: owner,
                tokenId: tokenId,
                data: data,
              });
            });

            it('should call onERC721Received from approved', async function () {
              receipt = await transferFun.call(this, owner, this.receiver.address, tokenId, {from: approved});

              await expectEvent.inTransaction(receipt.tx, ERC721ReceiverMock, 'Received', {
                operator: approved,
                from: owner,
                tokenId: tokenId,
                data: data,
              });
            });

            it('reverts if a Non-Fungible Token does not exist', async function () {
              await expectRevert(
                transferFun.call(this, owner, this.receiver.address, unknownNFT, {from: owner}),
                revertMessages.NonOwnedNFT
              );
            });
          });
        };

        describe('safeTransferFrom(address,address,uint256)', function () {
          shouldTransferSafely(safeTransferFromWithData, data);
        });

        describe('safeTransferFrom(address,address,uint256,bytes)', function () {
          shouldTransferSafely(safeTransferFromWithoutData, null);
        });

        it('reverts when sent to an ERC721Receiver contract which refuses the transfer', async function () {
          const invalidReceiver = await ERC721ReceiverMock.new(false);
          await expectRevert(
            this.token.methods['safeTransferFrom(address,address,uint256)'](owner, invalidReceiver.address, tokenId, {
              from: owner,
            }),
            revertMessages.TransferRejected
          );
        });

        it('reverts when sent to a contract which does not implement ERC721Receiver', async function () {
          const invalidReceiver = this.token;
          await expectRevert.unspecified(
            this.token.methods['safeTransferFrom(address,address,uint256)'](owner, invalidReceiver.address, tokenId, {
              from: owner,
            })
          );
        });
      });
    });

    describe('approve', function () {
      const tokenId = nft1;

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
        it('emits an approval event', async function () {
          expectEvent(receipt, 'Approval', {
            _owner: owner,
            _approved: address,
            _tokenId: tokenId,
          });
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

            expectEvent(receipt, 'ApprovalForAll', {
              _owner: owner,
              _operator: operator,
              _approved: true,
            });
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

            expectEvent(receipt, 'ApprovalForAll', {
              _owner: owner,
              _operator: operator,
              _approved: true,
            });
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

            expectEvent(receipt, 'ApprovalForAll', {
              _owner: owner,
              _operator: operator,
              _approved: true,
            });
          });
        });
      });

      it('reverts in case self-operator-approval', async function () {
        await expectRevert(this.token.setApprovalForAll(owner, true, {from: owner}), revertMessages.SelfApproval);
      });
    });

    describe('ERC165 interfaces support', function () {
      behaviors.shouldSupportInterfaces([interfaces.ERC165, interfaces721.ERC721]);
    });
  });
}

module.exports = {
  shouldBehaveLikeERC721,
};

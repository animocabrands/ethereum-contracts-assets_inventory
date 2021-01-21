const {artifacts, accounts, web3} = require('hardhat');
const {createFixtureLoader} = require('@animoca/ethereum-contracts-core_library/test/utils/fixture');
const {One, Two, Three, Zero} = require('@animoca/ethereum-contracts-core_library/src/constants');
const {BN, expectEvent, expectRevert} = require('@openzeppelin/test-helpers');
const {ZeroAddress} = require('@animoca/ethereum-contracts-core_library').constants;

const {
  makeFungibleCollectionId,
  makeNonFungibleCollectionId,
  makeNonFungibleTokenId,
  getNonFungibleBaseCollectionId,
} = require('@animoca/blockchain-inventory_metadata').inventoryIds;

const Mock = artifacts.require('ERC1155InventoryMock');
const ReceiverMock = artifacts.require('ERC1155721ReceiverMock');
const ReceiverMock721 = artifacts.require('ERC721ReceiverMock');

function shouldBehaveLikeERC1155721MintableInventory({
  nfMaskLength,
  contractName,
  revertMessages,
  deploy,
  safeMint,
  safeBatchMint,
  mint_ERC721,
  safeMint_ERC721,
  batchMint_ERC721,
}) {
  const [creator, minter, nonMinter, owner] = accounts;

  if (mint_ERC721 === undefined) {
    console.log(
      `ERC1155721MintableInventory: non-standard ERC721 method mint(address,uint256) is not supported by ${contractName}, associated tests will be skipped`
    );
  }
  if (safeMint_ERC721 === undefined) {
    console.log(
      `ERC1155721MintableInventory: non-standard ERC721 method safeMint(address,uint256,bytes) is not supported by ${contractName}, associated tests will be skipped`
    );
  }
  if (batchMint_ERC721 === undefined) {
    console.log(
      `ERC1155721MintableInventory: non-standard ERC721 method batchMint(address,uint256[]) is not supported by ${contractName}, associated tests will be skipped`
    );
  }

  const fCollection1 = makeFungibleCollectionId(1);
  const fCollection2 = makeFungibleCollectionId(2);
  const fCollection3 = makeFungibleCollectionId(3);
  const nfCollection1 = makeNonFungibleCollectionId(1, nfMaskLength);
  const nfCollection2 = makeNonFungibleCollectionId(2, nfMaskLength);
  const nft1 = makeNonFungibleTokenId(1, getNonFungibleBaseCollectionId(nfCollection1, nfMaskLength), nfMaskLength);
  const nft2 = makeNonFungibleTokenId(1, getNonFungibleBaseCollectionId(nfCollection2, nfMaskLength), nfMaskLength);
  const nft3 = makeNonFungibleTokenId(2, getNonFungibleBaseCollectionId(nfCollection2, nfMaskLength), nfMaskLength);

  describe('like a mintable ERC1155721Inventory', function () {
    const fixtureLoader = createFixtureLoader(accounts, web3.eth.currentProvider);
    const fixture = async function () {
      this.token = await deploy(creator);
      await this.token.addMinter(minter, {from: creator});
      this.receiver = await ReceiverMock.new(true, true);
      this.receiver721 = await ReceiverMock721.new(true);
    };

    beforeEach(async function () {
      await fixtureLoader(fixture, this);
    });

    context('ERC1155 minting', function () {
      context('safeMint(address,uint256,uint256,bytes)', function () {
        it('reverts if the caller is not a minter', async function () {
          await expectRevert(safeMint(this.token, owner, nft1, 1, '0x', {from: nonMinter}), revertMessages.NotMinter);
        });

        context('when successful', function () {
          const mint = function () {
            beforeEach(async function () {
              this.nftBalance = await this.token.balanceOf(this.toWhom);
              this.supply = await this.token.totalSupply(nfCollection1);
              this.nftSupply = await this.token.totalSupply(nft1);
              this.receipt = await safeMint(this.token, this.toWhom, nft1, 1, '0x', {from: minter});
            });

            it('should increase the non-fungible token balance of the target account', async function () {
              (await this.token.balanceOf(this.toWhom)).should.be.bignumber.equal(this.nftBalance.add(One));
            });

            it('should increase the non-fungible token supply', async function () {
              (await this.token.totalSupply(nft1)).should.be.bignumber.equal(this.nftSupply.addn(1));
            });

            it('should increase the non-fungible collection supply', async function () {
              (await this.token.totalSupply(nfCollection1)).should.be.bignumber.equal(this.supply.addn(1));
            });

            it('should emit the Transfer event', async function () {
              expectEvent(this.receipt, 'Transfer', {
                _from: ZeroAddress,
                _to: this.toWhom,
                _tokenId: nft1,
              });
            });
          };

          context('minted to a user account', function () {
            beforeEach(async function () {
              this.toWhom = owner;
            });

            mint();
          });

          context('minted to a receiver contract', function () {
            beforeEach(async function () {
              this.toWhom = this.receiver.address;
            });

            mint();

            it('should safely receive', async function () {
              await expectEvent.inTransaction(this.receipt.tx, this.receiver, 'ReceivedSingle', {
                operator: minter,
                from: ZeroAddress,
                id: nft1,
                value: 1,
                data: null,
              });
            });
          });
        });
      });

      context('safeBatchMint(address,uint256[],uint256[],bytes)', function () {
        it('reverts if the caller is not a minter', async function () {
          await expectRevert(
            safeBatchMint(this.token, owner, [fCollection1], [new BN(0)], '0x', {from: nonMinter}),
            revertMessages.NotMinter
          );
        });

        it('reverts if the fungible quantity is less than 1', async function () {
          await expectRevert(
            safeBatchMint(this.token, owner, [fCollection1], [new BN(0)], '0x', {from: minter}),
            revertMessages.ZeroValue
          );
        });

        it('reverts if the non-fungible quantity is greater than 1', async function () {
          await expectRevert(
            safeBatchMint(this.token, owner, [nft1], [Two], '0x', {from: minter}),
            revertMessages.WrongNFTValue
          );
        });

        it('reverts if the non-fungible quantity is less than 1', async function () {
          await expectRevert(
            safeBatchMint(this.token, owner, [nft1], [Zero], '0x', {from: minter}),
            revertMessages.WrongNFTValue
          );
        });

        it('reverts if there is a mismatch in the param array lengths', async function () {
          await expectRevert(
            safeBatchMint(this.token, owner, [nft1, nft2, nft3], [new BN(1), new BN(1)], '0x', {
              from: minter,
            }),
            revertMessages.InconsistentArrays
          );
        });

        it('reverts if minting a collection', async function () {
          await expectRevert(
            safeBatchMint(this.token, owner, [nfCollection1], [new BN(1)], '0x', {from: minter}),
            revertMessages.NotTokenId
          );
        });

        it('reverts if minting a non-fungible token that already has been minted', async function () {
          await expectRevert(
            safeBatchMint(this.token, owner, [nft1, nft2, nft2], [new BN(1), new BN(1), new BN(1)], '0x', {
              from: minter,
            }),
            revertMessages.ExistingOrBurntNFT
          );
        });

        context('when successful', function () {
          const batchMint = function () {
            beforeEach(async function () {
              this.tokensToBatchMint = {
                ids: [nft1, nft2, nft3, fCollection1, fCollection2, fCollection3],
                supplies: [new BN(1), new BN(1), new BN(1), new BN(1), new BN(2), new BN(3)],
              };
              this.nftBalance = await this.token.balanceOf(this.toWhom);
              this.supplies = {
                fCollection1: await this.token.totalSupply(fCollection1),
                fCollection2: await this.token.totalSupply(fCollection2),
                fCollection3: await this.token.totalSupply(fCollection3),
                nfCollection1: await this.token.totalSupply(nfCollection1),
                nfCollection2: await this.token.totalSupply(nfCollection2),
                nft1: await this.token.totalSupply(nft1),
                nft2: await this.token.totalSupply(nft2),
                nft3: await this.token.totalSupply(nft3),
              };
              this.receipt = await safeBatchMint(
                this.token,
                this.toWhom,
                this.tokensToBatchMint.ids,
                this.tokensToBatchMint.supplies,
                '0x',
                {from: minter}
              );
            });

            it('should increase the non-fungible token balance of the target account', async function () {
              (await this.token.balanceOf(this.toWhom)).should.be.bignumber.equal(this.nftBalance.add(Three));
            });

            it('should increase the non-fungible token supply', async function () {
              (await this.token.totalSupply(nft1)).should.be.bignumber.equal(this.supplies.nft1.addn(1));
              (await this.token.totalSupply(nft2)).should.be.bignumber.equal(this.supplies.nft2.addn(1));
              (await this.token.totalSupply(nft3)).should.be.bignumber.equal(this.supplies.nft3.addn(1));
            });

            it('should increase the non-fungible collection supply', async function () {
              (await this.token.totalSupply(nfCollection1)).should.be.bignumber.equal(
                this.supplies.nfCollection1.addn(1)
              );
              (await this.token.totalSupply(nfCollection2)).should.be.bignumber.equal(
                this.supplies.nfCollection2.addn(2)
              );
            });

            it('should increase the fungible collection supply', async function () {
              (await this.token.totalSupply(fCollection1)).should.be.bignumber.equal(
                this.supplies.fCollection1.addn(1)
              );
              (await this.token.totalSupply(fCollection2)).should.be.bignumber.equal(
                this.supplies.fCollection2.addn(2)
              );
              (await this.token.totalSupply(fCollection3)).should.be.bignumber.equal(
                this.supplies.fCollection3.addn(3)
              );
            });

            it('should emit Transfer events', async function () {
              expectEvent(this.receipt, 'Transfer', {
                _from: ZeroAddress,
                _to: this.toWhom,
                _tokenId: nft1,
              });

              expectEvent(this.receipt, 'Transfer', {
                _from: ZeroAddress,
                _to: this.toWhom,
                _tokenId: nft2,
              });

              expectEvent(this.receipt, 'Transfer', {
                _from: ZeroAddress,
                _to: this.toWhom,
                _tokenId: nft3,
              });
            });
          };

          context('minted to a user account', function () {
            beforeEach(async function () {
              this.toWhom = owner;
            });

            batchMint();
          });

          context('minted to a receiver contract', function () {
            beforeEach(async function () {
              this.toWhom = this.receiver.address;
            });

            batchMint();

            it('should safely receive', async function () {
              await expectEvent.inTransaction(this.receipt.tx, this.receiver, 'ReceivedBatch', {
                operator: minter,
                from: ZeroAddress,
                ids: this.tokensToBatchMint.ids,
                values: this.tokensToBatchMint.supplies,
                data: null,
              });
            });
          });
        });
      });
    });

    context('ERC721 minting', function () {
      context('mint(address,uint256)', function () {
        if (mint_ERC721 === undefined) {
          return;
        }

        it('reverts if the caller is not a minter', async function () {
          await expectRevert(mint_ERC721(this.token, owner, nft1, {from: nonMinter}), revertMessages.NotMinter);
        });

        context('when successful', function () {
          const mint = function () {
            beforeEach(async function () {
              this.nftBalance = await this.token.balanceOf(this.toWhom);
              this.supply = await this.token.totalSupply(nfCollection1);
              this.nftSupply = await this.token.totalSupply(nft1);
              this.receipt = await mint_ERC721(this.token, this.toWhom, nft1, {from: minter});
            });

            it('should increase the non-fungible token balance of the target account', async function () {
              (await this.token.balanceOf(this.toWhom)).should.be.bignumber.equal(this.nftBalance.add(One));
            });

            it('should increase the non-fungible token supply', async function () {
              (await this.token.totalSupply(nft1)).should.be.bignumber.equal(this.nftSupply.addn(1));
            });

            it('should increase the non-fungible collection supply', async function () {
              (await this.token.totalSupply(nfCollection1)).should.be.bignumber.equal(this.supply.addn(1));
            });

            it('should emit the Transfer event', async function () {
              expectEvent(this.receipt, 'Transfer', {
                _from: ZeroAddress,
                _to: this.toWhom,
                _tokenId: nft1,
              });
            });
          };

          context('minted to a user account', function () {
            beforeEach(async function () {
              this.toWhom = owner;
            });

            mint();
          });

          context('minted to an ERC1155TokenReceiver contract', function () {
            beforeEach(async function () {
              this.toWhom = this.receiver.address;
            });

            mint();

            it('should safely receive', async function () {
              await expectEvent.inTransaction(this.receipt.tx, this.receiver, 'ReceivedSingle', {
                operator: minter,
                from: ZeroAddress,
                id: nft1,
                value: 1,
                data: null,
              });
            });
          });

          context('minted to an ERC-721 receiver contract', function () {
            beforeEach(async function () {
              this.toWhom = this.receiver721.address;
            });

            mint();

            it('should NOT safely receive', async function () {
              await expectEvent.notEmitted.inTransaction(this.receipt.tx, this.receiver721, 'Received');
            });
          });
        });
      });

      context('safeMint(address,uint256)', function () {
        if (safeMint_ERC721 === undefined) {
          return;
        }

        it('reverts if the caller is not a minter', async function () {
          await expectRevert(
            safeMint_ERC721(this.token, owner, nft1, '0x', {from: nonMinter}),
            revertMessages.NotMinter
          );
        });

        it('reverts if the recipient is a non-receiver contract', async function () {
          const receiver = await Mock.new();
          await expectRevert.unspecified(safeMint_ERC721(this.token, receiver.address, nft1, '0x', {from: minter}));
        });

        it('reverts if the recipient is an ERC721Receiver which refuses the transfer', async function () {
          const receiver = await ReceiverMock721.new(false);
          await expectRevert(
            safeMint_ERC721(this.token, receiver.address, nft1, '0x', {from: minter}),
            revertMessages.TransferRejected
          );
        });

        it('reverts if the recipient is an ERC1155TokenReceiver which refuses the transfer', async function () {
          const receiver = await ReceiverMock.new(true, false);
          await expectRevert(
            safeMint_ERC721(this.token, receiver.address, nft1, '0x', {from: minter}),
            revertMessages.TransferRejected
          );
        });

        context('when successful', function () {
          const mint = function () {
            beforeEach(async function () {
              this.nftBalance = await this.token.balanceOf(this.toWhom);
              this.supply = await this.token.totalSupply(nfCollection1);
              this.nftSupply = await this.token.totalSupply(nft1);
              this.receipt = await safeMint_ERC721(this.token, this.toWhom, nft1, '0x', {from: minter});
            });

            it('should increase the non-fungible token balance of the target account', async function () {
              (await this.token.balanceOf(this.toWhom)).should.be.bignumber.equal(this.nftBalance.add(One));
            });

            it('should increase the non-fungible token supply', async function () {
              (await this.token.totalSupply(nft1)).should.be.bignumber.equal(this.nftSupply.addn(1));
            });

            it('should increase the non-fungible collection supply', async function () {
              (await this.token.totalSupply(nfCollection1)).should.be.bignumber.equal(this.supply.addn(1));
            });

            it('should emit the Transfer event', async function () {
              expectEvent(this.receipt, 'Transfer', {
                _from: ZeroAddress,
                _to: this.toWhom,
                _tokenId: nft1,
              });
            });
          };

          context('minted to a user account', function () {
            beforeEach(async function () {
              this.toWhom = owner;
            });

            mint();
          });

          context('minted to an ERC1155TokenReceiver contract', function () {
            beforeEach(async function () {
              this.toWhom = this.receiver.address;
            });

            mint();

            it('should safely receive', async function () {
              await expectEvent.inTransaction(this.receipt.tx, this.receiver, 'ReceivedSingle', {
                operator: minter,
                from: ZeroAddress,
                id: nft1,
                value: 1,
                data: null,
              });
            });
          });

          context('minted to an ERC-721 receiver contract', function () {
            beforeEach(async function () {
              this.toWhom = this.receiver721.address;
            });

            mint();

            it('should safely receive', async function () {
              await expectEvent.inTransaction(this.receipt.tx, this.receiver721, 'Received', {
                operator: minter,
                from: ZeroAddress,
                tokenId: nft1,
                data: null,
              });
            });
          });
        });
      });

      context('safeMint(address,uint256,bytes)', function () {
        if (safeMint_ERC721 === undefined) {
          return;
        }

        const data = '0x42';
        it('reverts if the caller is not a minter', async function () {
          await expectRevert(
            safeMint_ERC721(this.token, owner, nft1, data, {from: nonMinter}),
            revertMessages.NotMinter
          );
        });

        it('reverts if the recipient is a non-receiver contract', async function () {
          const receiver = await Mock.new();
          await expectRevert.unspecified(safeMint_ERC721(this.token, receiver.address, nft1, data, {from: minter}));
        });

        it('reverts if the recipient is an ERC721Receiver which refuses the transfer', async function () {
          const receiver = await ReceiverMock721.new(false);
          await expectRevert(
            safeMint_ERC721(this.token, receiver.address, nft1, data, {from: minter}),
            revertMessages.TransferRejected
          );
        });

        it('reverts if the recipient is an ERC1155TokenReceiver which refuses the transfer', async function () {
          const receiver = await ReceiverMock.new(true, false);
          await expectRevert(
            safeMint_ERC721(this.token, receiver.address, nft1, data, {from: minter}),
            revertMessages.TransferRejected
          );
        });

        context('when successful', function () {
          const mint = function () {
            beforeEach(async function () {
              this.nftBalance = await this.token.balanceOf(this.toWhom);
              this.supply = await this.token.totalSupply(nfCollection1);
              this.nftSupply = await this.token.totalSupply(nft1);
              this.receipt = await safeMint_ERC721(this.token, this.toWhom, nft1, data, {from: minter});
            });

            it('should increase the non-fungible token balance of the target account', async function () {
              (await this.token.balanceOf(this.toWhom)).should.be.bignumber.equal(this.nftBalance.add(One));
            });

            it('should increase the non-fungible token supply', async function () {
              (await this.token.totalSupply(nft1)).should.be.bignumber.equal(this.nftSupply.addn(1));
            });

            it('should increase the non-fungible collection supply', async function () {
              (await this.token.totalSupply(nfCollection1)).should.be.bignumber.equal(this.supply.addn(1));
            });

            it('should emit the Transfer event', async function () {
              expectEvent(this.receipt, 'Transfer', {
                _from: ZeroAddress,
                _to: this.toWhom,
                _tokenId: nft1,
              });
            });
          };

          context('minted to a user account', function () {
            beforeEach(async function () {
              this.toWhom = owner;
            });

            mint();
          });

          context('minted to an ERC1155TokenReceiver contract', function () {
            beforeEach(async function () {
              this.toWhom = this.receiver.address;
            });

            mint();

            it('should safely receive', async function () {
              await expectEvent.inTransaction(this.receipt.tx, this.receiver, 'ReceivedSingle', {
                operator: minter,
                from: ZeroAddress,
                id: nft1,
                value: 1,
                data,
              });
            });
          });

          context('minted to an ERC-721 receiver contract', function () {
            beforeEach(async function () {
              this.toWhom = this.receiver721.address;
            });

            mint();

            it('should safely receive', async function () {
              await expectEvent.inTransaction(this.receipt.tx, this.receiver721, 'Received', {
                operator: minter,
                from: ZeroAddress,
                tokenId: nft1,
                data,
              });
            });
          });
        });
      });

      context('batchMint(address,uint256[])', function () {
        if (batchMint_ERC721 === undefined) {
          return;
        }

        it('reverts if the caller is not a minter', async function () {
          await expectRevert(batchMint_ERC721(this.token, owner, [nft1], {from: nonMinter}), revertMessages.NotMinter);
        });

        it('reverts if `to` is the zero address', async function () {
          await expectRevert(
            batchMint_ERC721(this.token, ZeroAddress, [nft1], {from: minter}),
            revertMessages.TransferToZero
          );
        });

        it('reverts if the if any of the `nftIds` is a fungible collection', async function () {
          await expectRevert(
            batchMint_ERC721(this.token, owner, [fCollection1], {from: minter}),
            revertMessages.NotNFT
          );
        });

        it('reverts if the if any of the `nftIds` is a non-fungible collection', async function () {
          await expectRevert(
            batchMint_ERC721(this.token, owner, [nfCollection1], {from: minter}),
            revertMessages.NotNFT
          );
        });

        it('reverts if minting a non-fungible token that already has been minted', async function () {
          await expectRevert(
            batchMint_ERC721(this.token, owner, [nft2, nft2], {from: minter}),
            revertMessages.ExistingOrBurntNFT
          );
        });

        context('when successful', function () {
          const batchMint = function () {
            beforeEach(async function () {
              this.tokensToBatchMint = [nft1, nft2, nft3];
              this.nftBalance = await this.token.balanceOf(this.toWhom);
              this.supplies = {
                nfCollection1: await this.token.totalSupply(nfCollection1),
                nfCollection2: await this.token.totalSupply(nfCollection2),
                nft1: await this.token.totalSupply(nft1),
                nft2: await this.token.totalSupply(nft2),
                nft3: await this.token.totalSupply(nft3),
              };
              this.receipt = await batchMint_ERC721(this.token, this.toWhom, this.tokensToBatchMint, {
                from: minter,
              });
            });

            it('should increase the non-fungible token balance of the target account', async function () {
              (await this.token.balanceOf(this.toWhom)).should.be.bignumber.equal(this.nftBalance.add(Three));
            });

            it('should increase the non-fungible token supply', async function () {
              (await this.token.totalSupply(nft1)).should.be.bignumber.equal(this.supplies.nft1.addn(1));
              (await this.token.totalSupply(nft2)).should.be.bignumber.equal(this.supplies.nft2.addn(1));
              (await this.token.totalSupply(nft3)).should.be.bignumber.equal(this.supplies.nft3.addn(1));
            });

            it('should increase the non-fungible collection supply', async function () {
              (await this.token.totalSupply(nfCollection1)).should.be.bignumber.equal(
                this.supplies.nfCollection1.addn(1)
              );
              (await this.token.totalSupply(nfCollection2)).should.be.bignumber.equal(
                this.supplies.nfCollection2.addn(2)
              );
            });

            it('should emit Transfer events', async function () {
              this.tokensToBatchMint.forEach((tokenId) => {
                expectEvent(this.receipt, 'Transfer', {
                  _from: ZeroAddress,
                  _to: this.toWhom,
                  _tokenId: tokenId,
                });
              });
            });

            it('should emit the TransferBatch event', async function () {
              expectEvent(this.receipt, 'TransferBatch', {
                _operator: minter,
                _from: ZeroAddress,
                _to: this.toWhom,
                _ids: this.tokensToBatchMint,
                _values: Array(this.tokensToBatchMint.length).fill(1),
              });
            });
          };

          context('minted to a user account', function () {
            beforeEach(async function () {
              this.toWhom = owner;
            });

            batchMint();
          });

          context('minted to an ERC1155 receiver contract', function () {
            beforeEach(async function () {
              this.toWhom = this.receiver.address;
            });

            batchMint();

            it('should safely receive', async function () {
              await expectEvent.inTransaction(this.receipt.tx, this.receiver, 'ReceivedBatch', {
                operator: minter,
                from: ZeroAddress,
                ids: this.tokensToBatchMint,
                values: Array(this.tokensToBatchMint.length).fill(1),
                data: null,
              });
            });
          });

          context('minted to an ERC721 receiver contract', function () {
            beforeEach(async function () {
              this.toWhom = this.receiver721.address;
            });

            batchMint();

            it('should NOT safely receive', async function () {
              await expectEvent.notEmitted.inTransaction(this.receipt.tx, this.receiver721, 'Received');
            });
          });
        });
      });
    });
  });
}

module.exports = {
  shouldBehaveLikeERC1155721MintableInventory,
};

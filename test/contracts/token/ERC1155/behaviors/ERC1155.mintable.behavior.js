const {artifacts, accounts, web3} = require('hardhat');
const {createFixtureLoader} = require('@animoca/ethereum-contracts-core_library/test/utils/fixture');
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

function shouldBehaveLikeERC1155Mintable({nfMaskLength, revertMessages, interfaces, methods, deploy, mint}) {
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
          expectEvent(receipt, 'TransferBatch', {
            _operator: options.from,
            _from: ZeroAddress,
            _to: this.toWhom,
            _ids: tokenIds,
            _values: values,
          });
        });
      } else {
        it('emits a TransferSingle event', function () {
          expectEvent(receipt, 'TransferSingle', {
            _operator: options.from,
            _from: ZeroAddress,
            _to: this.toWhom,
            _id: tokenIds,
            _value: values,
          });
        });
      }

      if (interfaces.ERC721) {
        it('[ERC721] emits Transfer event(s) for Non-Fungible Tokens', function () {
          const ids = Array.isArray(tokenIds) ? tokenIds : [tokenIds];
          for (const id of ids) {
            if (isNonFungibleToken(id, nfMaskLength)) {
              expectEvent(receipt, 'Transfer', {
                _from: ZeroAddress,
                _to: this.toWhom,
                _tokenId: id,
              });
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

    const shouldMintTokenToRecipient = function (mintFunction, ids, values, data) {
      const options = {from: minter};
      describe('Pre-conditions', function () {
        it('reverts if the sender is not a Minter', async function () {
          await expectRevert(mintFunction.call(this, owner, nft1, 1, '0x', {from: other}), revertMessages.NotMinter);
        });

        it('reverts if transferred to the zero address', async function () {
          await expectRevert(mintFunction.call(this, ZeroAddress, ids, values, data, options), revertMessages.TransferToZero);
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
          await expectRevert.unspecified(mintFunction.call(this, this.token.address, ids, values, data, options));
        });
        it('reverts when sent to an ERC721Receiver', async function () {
          await expectRevert.unspecified(mintFunction.call(this, this.receiver721.address, ids, values, data, options));
        });
        it('reverts when sent to an ERC1155TokenReceiver which refuses the transfer', async function () {
          await expectRevert(mintFunction.call(this, this.refusingReceiver1155.address, ids, values, data, options), revertMessages.TransferRejected);
        });
      });

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
    };

    describe('safeMint(address,uint256,uint256,bytes)', function () {
      if (safeMint === undefined) {
        return;
      }

      const mintFn = async function (to, id, value, data, options) {
        return safeMint(this.token, to, id, value, data, options);
      };

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

    // context('safeBatchMint(address,uint256[],uint256[],bytes)', function () {
    //   if (safeBatchMint === undefined) {
    //     return;
    //   }

    //   it('reverts if the sender is not a Minter', async function () {
    //     await expectRevert(
    //       safeBatchMint(this.token, owner, tokensToBatchMint.ids, tokensToBatchMint.supplies, '0x', {
    //         from: other,
    //       }),
    //       revertMessages.NotMinter
    //     );
    //   });

    //   it('reverts if sent to the zero address', async function () {
    //     await expectRevert(safeBatchMint(this.token, ZeroAddress, [nft1], [1], '0x', {from: minter}), revertMessages.TransferToZero);
    //   });

    //   it('reverts if the fungible quantity is less than 1', async function () {
    //     await expectRevert(safeBatchMint(this.token, owner, [fCollection1], [new BN(0)], '0x', {from: minter}), revertMessages.ZeroValue);
    //   });

    //   it('it reverts if the non-fungible quantity is greater than 1', async function () {
    //     await expectRevert(safeBatchMint(this.token, owner, [nft1], [new BN(2)], '0x', {from: minter}), revertMessages.WrongNFTValue);
    //   });

    //   it('it reverts if the non-fungible quantity is less than 1', async function () {
    //     await expectRevert(safeBatchMint(this.token, owner, [nft1], [new BN(0)], '0x', {from: minter}), revertMessages.WrongNFTValue);
    //   });

    //   it('it reverts if there is a mismatch in the param array lengths', async function () {
    //     const wrongTokensToBatchMint = {
    //       ids: [nft1, nft2, nft3],
    //       supplies: [new BN(1), new BN(1)],
    //     };

    //     await expectRevert(
    //       safeBatchMint(this.token, owner, wrongTokensToBatchMint.ids, wrongTokensToBatchMint.supplies, '0x', {
    //         from: minter,
    //       }),
    //       revertMessages.InconsistentArrays
    //     );
    //   });

    //   it('reverts if minting a collection', async function () {
    //     const wrongTokensToBatchMint = {
    //       ids: [nfCollection1], // can't mint a non-fungible collection
    //       supplies: [new BN(1)],
    //     };

    //     await expectRevert(
    //       safeBatchMint(this.token, owner, wrongTokensToBatchMint.ids, wrongTokensToBatchMint.supplies, '0x', {
    //         from: minter,
    //       }),
    //       revertMessages.NotToken
    //     );
    //   });

    //   it('reverts if minting a non-fungible token that already has been minted', async function () {
    //     const wrongTokensToBatchMint = {
    //       ids: [nft1, nft2, nft2], // same token id
    //       supplies: [new BN(1), new BN(1), new BN(1)],
    //     };

    //     await expectRevert(
    //       safeBatchMint(this.token, owner, wrongTokensToBatchMint.ids, wrongTokensToBatchMint.supplies, '0x', {
    //         from: minter,
    //       }),
    //       revertMessages.ExistingOrBurntNFT
    //     );
    //   });

    //   context('when successful', function () {
    //     beforeEach(async function () {
    //       this.supplies = {
    //         fCollection1: await this.token.totalSupply(fCollection1),
    //         fCollection2: await this.token.totalSupply(fCollection2),
    //         fCollection3: await this.token.totalSupply(fCollection3),
    //         nfCollection1: await this.token.totalSupply(nfCollection1),
    //         nfCollection2: await this.token.totalSupply(nfCollection2),
    //         nft1: await this.token.totalSupply(nft1),
    //         nft2: await this.token.totalSupply(nft2),
    //         nft3: await this.token.totalSupply(nft3),
    //       };
    //       this.receipt = await safeBatchMint(this.token, owner, tokensToBatchMint.ids, tokensToBatchMint.supplies, '0x', {from: minter});
    //     });

    //     it('should increase thefungible token balances of the owner', async function () {
    //       (await this.token.balanceOf(owner, fCollection1)).toNumber().should.be.equal(1);
    //       (await this.token.balanceOf(owner, fCollection2)).toNumber().should.be.equal(2);
    //       (await this.token.balanceOf(owner, fCollection3)).toNumber().should.be.equal(3);
    //     });

    //     it('should emit a TransferBatch event', async function () {
    //       let totalIdCount = 0;
    //       for (let log of this.receipt.logs) {
    //         if (log.event === 'TransferBatch' && log.args._operator === minter && log.args._from === ZeroAddress && log.args._to === owner) {
    //           for (let j = 0; j < tokensToBatchMint.ids.length; ++j) {
    //             let id = new BN(log.args._ids[j]);
    //             id.should.be.bignumber.equal(tokensToBatchMint.ids[j]);
    //             let supply = new BN(log.args._values[j]);
    //             supply.should.be.bignumber.equal(tokensToBatchMint.supplies[j]);
    //           }
    //         }
    //       }
    //     });

    //     it('should assign the NFTs to the new owner', async function () {
    //       (await this.token.ownerOf(nft1)).should.be.equal(owner);
    //       (await this.token.ownerOf(nft2)).should.be.equal(owner);
    //       (await this.token.ownerOf(nft3)).should.be.equal(owner);
    //     });

    //     it('should increase the non-fungible token balances of the owner', async function () {
    //       (await this.token.balanceOf(owner, nft1)).should.be.bignumber.equal('1');
    //       (await this.token.balanceOf(owner, nft2)).should.be.bignumber.equal('1');
    //       (await this.token.balanceOf(owner, nft3)).should.be.bignumber.equal('1');
    //     });

    //     it('should increase the non-fungible collection balance of the owner', async function () {
    //       (await this.token.balanceOf(owner, nfCollection1)).should.be.bignumber.equal('1');
    //       (await this.token.balanceOf(owner, nfCollection2)).should.be.bignumber.equal('2');
    //     });

    //     it('should increase the non-fungible token supply', async function () {
    //       (await this.token.totalSupply(nft1)).should.be.bignumber.equal(this.supplies.nft1.addn(1));
    //       (await this.token.totalSupply(nft2)).should.be.bignumber.equal(this.supplies.nft2.addn(1));
    //       (await this.token.totalSupply(nft3)).should.be.bignumber.equal(this.supplies.nft3.addn(1));
    //     });

    //     it('should increase the non-fungible collection supply', async function () {
    //       (await this.token.totalSupply(nfCollection1)).should.be.bignumber.equal(this.supplies.nfCollection1.addn(1));
    //       (await this.token.totalSupply(nfCollection2)).should.be.bignumber.equal(this.supplies.nfCollection2.addn(2));
    //     });

    //     it('should increase the fungible collection supply', async function () {
    //       (await this.token.totalSupply(fCollection1)).should.be.bignumber.equal(this.supplies.fCollection1.addn(1));
    //       (await this.token.totalSupply(fCollection2)).should.be.bignumber.equal(this.supplies.fCollection2.addn(2));
    //       (await this.token.totalSupply(fCollection3)).should.be.bignumber.equal(this.supplies.fCollection3.addn(3));
    //     });
    //   });

    //   context('if the recipient is a contract', function () {
    //     it('reverts if the contract does not implement ERC1155TokenReceiver', async function () {
    //       this.receiver = await ReceiverMock.new(false, false, {from: deployer});
    //       await expectRevert.unspecified(
    //         safeBatchMint(this.token, this.receiver.address, tokensToBatchMint.ids, tokensToBatchMint.supplies, '0x', {
    //           from: minter,
    //         })
    //       );
    //     });

    //     it('should emit the ReceivedBatch event', async function () {
    //       this.receiver = await ReceiverMock.new(false, true, {from: deployer});
    //       this.receipt = await safeBatchMint(this.token, this.receiver.address, tokensToBatchMint.ids, tokensToBatchMint.supplies, '0x', {
    //         from: minter,
    //       });
    //       await expectEvent.inTransaction(this.receipt.tx, this.receiver, 'ReceivedBatch', {
    //         operator: minter,
    //         from: ZeroAddress,
    //         ids: tokensToBatchMint.ids,
    //         values: tokensToBatchMint.supplies,
    //         data: null,
    //       });
    //     });
    //   });

    //   context('with an empty list of tokens', function () {
    //     const from = owner;
    //     beforeEach(async function () {
    //       this.receipt = await safeBatchMint(this.token, owner, [], [], '0x', {from: minter});
    //     });
    //     it('emits the TransferBatch event', async function () {
    //       expectEvent(this.receipt, 'TransferBatch', {
    //         _operator: minter,
    //         _from: ZeroAddress,
    //         _to: owner,
    //         _ids: [],
    //         _values: [],
    //       });
    //     });
    //   });
    // });
  });
}

module.exports = {
  shouldBehaveLikeERC1155Mintable,
};

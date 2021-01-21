const {artifacts, accounts, web3} = require('hardhat');
const {createFixtureLoader} = require('@animoca/ethereum-contracts-core_library/test/utils/fixture');
const {MaxUInt256} = require('@animoca/ethereum-contracts-core_library/src/constants');
const {BN, expectEvent, expectRevert} = require('@openzeppelin/test-helpers');
const {One, ZeroAddress} = require('@animoca/ethereum-contracts-core_library').constants;

const {
  makeFungibleCollectionId,
  makeNonFungibleCollectionId,
  makeNonFungibleTokenId,
  getNonFungibleBaseCollectionId,
} = require('@animoca/blockchain-inventory_metadata').inventoryIds;

const ReceiverMock = artifacts.require('ERC1155721ReceiverMock');

function shouldBehaveLikeERC1155MintableInventory({nfMaskLength, deploy, safeMint, safeBatchMint, revertMessages}) {
  const [creator, minter, owner, _operator, _approved, other] = accounts;

  const fCollection1 = makeFungibleCollectionId(111);
  const fCollection2 = makeFungibleCollectionId(222);
  const fCollection3 = makeFungibleCollectionId(333);
  const nfCollection1 = makeNonFungibleCollectionId(101, nfMaskLength);
  const nfCollection2 = makeNonFungibleCollectionId(202, nfMaskLength);
  const nft1 = makeNonFungibleTokenId(1, getNonFungibleBaseCollectionId(nfCollection1, nfMaskLength), nfMaskLength);
  const nft2 = makeNonFungibleTokenId(1, getNonFungibleBaseCollectionId(nfCollection2, nfMaskLength), nfMaskLength);
  const nft3 = makeNonFungibleTokenId(2, getNonFungibleBaseCollectionId(nfCollection2, nfMaskLength), nfMaskLength);

  const tokensToBatchMint = {
    ids: [nft1, nft2, nft3, fCollection1, fCollection2, fCollection3],
    supplies: [new BN(1), new BN(1), new BN(1), new BN(1), new BN(2), new BN(3)],
  };

  describe('like a mintable ERC1155Inventory', function () {
    const fixtureLoader = createFixtureLoader(accounts, web3.eth.currentProvider);
    const fixture = async function () {
      this.token = await deploy(creator);
      await this.token.addMinter(minter, {from: creator});
    };

    beforeEach(async function () {
      await fixtureLoader(fixture, this);
    });

    context('minting NFT', function () {
      it('reverts if the sender is not a Minter', async function () {
        await expectRevert(safeMint(this.token, owner, nft1, 1, '0x', {from: other}), revertMessages.NotMinter);
      });

      it('reverts if sent to the zero address', async function () {
        await expectRevert(
          safeMint(this.token, ZeroAddress, nft1, 1, '0x', {from: minter}),
          revertMessages.TransferToZero
        );
      });

      it('reverts if the token has already been minted', async function () {
        await safeMint(this.token, owner, nft1, 1, '0x', {from: minter});
        await expectRevert(
          safeMint(this.token, owner, nft1, 1, '0x', {from: minter}),
          revertMessages.ExistingOrBurntNFT
        );
      });

      context('when successful', function () {
        beforeEach(async function () {
          this.uri = await this.token.uri(nft1);
          this.supply = await this.token.totalSupply(nfCollection1);
          this.nftSupply = await this.token.totalSupply(nft1);
          this.receipt = await safeMint(this.token, owner, nft1, 1, '0x', {from: minter});
        });

        it('should assign the token to the new owner', async function () {
          (await this.token.ownerOf(nft1)).should.be.equal(owner);
        });

        it('should increase the non-fungible token balance of the owner', async function () {
          (await this.token.balanceOf(owner, nft1)).should.be.bignumber.equal('1');
        });

        it('should increase the non-fungible collection balance of the owner', async function () {
          (await this.token.balanceOf(owner, nfCollection1)).should.be.bignumber.equal('1');
        });

        it('should increase the non-fungible token supply', async function () {
          (await this.token.totalSupply(nft1)).should.be.bignumber.equal(this.nftSupply.addn(1));
        });

        it('should increase the non-fungible collection supply', async function () {
          (await this.token.totalSupply(nfCollection1)).should.be.bignumber.equal(this.supply.addn(1));
        });

        it('should emit the TransferSingle event', async function () {
          expectEvent(this.receipt, 'TransferSingle', {
            _operator: minter,
            _from: ZeroAddress,
            _to: owner,
            _id: nft1,
            _value: new BN('1'),
          });
        });
      });

      context('if the recipient is a contract', function () {
        it('reverts if the contract does not implement ERC1155TokenReceiver', async function () {
          this.receiver = await ReceiverMock.new(false, false, {from: creator});
          await expectRevert.unspecified(safeMint(this.token, this.receiver.address, nft1, 1, '0x', {from: minter}));
        });

        it('should emit the ReceivedSingle event', async function () {
          this.receiver = await ReceiverMock.new(false, true, {from: creator});
          this.receipt = await safeMint(this.token, this.receiver.address, nft1, 1, '0x', {from: minter});
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

    context('minting fungible', function () {
      let supply = new BN(10);

      it('reverts if the sender is not a Minter', async function () {
        await expectRevert(
          safeMint(this.token, owner, fCollection1, supply, '0x', {from: other}),
          revertMessages.NotMinter
        );
      });

      it('reverts if sent to the zero address', async function () {
        await expectRevert(
          safeMint(this.token, ZeroAddress, fCollection1, supply, '0x', {from: minter}),
          revertMessages.TransferToZero
        );
      });

      it('reverts if minting an overflowing supply', async function () {
        await safeMint(this.token, owner, fCollection1, MaxUInt256, '0x', {from: minter});
        await expectRevert(
          safeMint(this.token, owner, fCollection1, 1, '0x', {from: minter}),
          revertMessages.SupplyOverflow
        );
      });

      it('should mint if the token has already been minted', async function () {
        await safeMint(this.token, owner, fCollection1, supply, '0x', {from: minter});
        await safeMint(this.token, owner, fCollection1, supply, '0x', {from: minter});
        (await this.token.balanceOf(owner, fCollection1)).toNumber().should.be.equal(supply.toNumber() * 2);
      });

      context('when successful', function () {
        beforeEach(async function () {
          this.supply = await this.token.totalSupply(fCollection1);
          this.receipt = await safeMint(this.token, owner, fCollection1, supply, '0x', {from: minter});
        });

        it('should increase thefungible token balance of the owner', async function () {
          (await this.token.balanceOf(owner, fCollection1)).toNumber().should.be.equal(supply.toNumber());
        });

        it('should increase the fungible collection supply', async function () {
          (await this.token.totalSupply(fCollection1)).should.be.bignumber.equal(this.supply.add(supply));
        });

        it('should emit the TransferSingle event', async function () {
          expectEvent(this.receipt, 'TransferSingle', {
            _operator: minter,
            _from: ZeroAddress,
            _to: owner,
            _id: fCollection1,
            _value: supply,
          });
        });
      });

      context('if the recipient is a contract', function () {
        it('reverts if the contract does not implement ERC1155TokenReceiver', async function () {
          this.receiver = await ReceiverMock.new(false, false, {from: creator});
          await expectRevert.unspecified(
            safeMint(this.token, this.receiver.address, fCollection1, supply, '0x', {from: minter})
          );
        });

        it('should emit the ReceivedSingle event', async function () {
          this.receiver = await ReceiverMock.new(false, true, {from: creator});
          this.receipt = await safeMint(this.token, this.receiver.address, fCollection1, supply, '0x', {from: minter});
          await expectEvent.inTransaction(this.receipt.tx, this.receiver, 'ReceivedSingle', {
            operator: minter,
            from: ZeroAddress,
            id: fCollection1,
            value: supply,
            data: null,
          });
        });
      });
    });

    context('batch minting', function () {
      it('reverts if the sender is not a Minter', async function () {
        await expectRevert(
          safeBatchMint(this.token, owner, tokensToBatchMint.ids, tokensToBatchMint.supplies, '0x', {from: other}),
          revertMessages.NotMinter
        );
      });

      it('reverts if the fungible quantity is less than 1', async function () {
        await expectRevert(
          safeBatchMint(this.token, owner, [fCollection1], [new BN(0)], '0x', {from: minter}),
          revertMessages.ZeroValue
        );
      });

      it('it reverts if the non-fungible quantity is greater than 1', async function () {
        await expectRevert(
          safeBatchMint(this.token, owner, [nft1], [new BN(2)], '0x', {from: minter}),
          revertMessages.WrongNFTValue
        );
      });

      it('it reverts if the non-fungible quantity is less than 1', async function () {
        await expectRevert(
          safeBatchMint(this.token, owner, [nft1], [new BN(0)], '0x', {from: minter}),
          revertMessages.WrongNFTValue
        );
      });

      it('it reverts if there is a mismatch in the param array lengths', async function () {
        const wrongTokensToBatchMint = {
          ids: [nft1, nft2, nft3],
          supplies: [new BN(1), new BN(1)],
        };

        await expectRevert(
          safeBatchMint(this.token, owner, wrongTokensToBatchMint.ids, wrongTokensToBatchMint.supplies, '0x', {
            from: minter,
          }),
          revertMessages.InconsistentArrays
        );
      });

      it('reverts if minting a collection', async function () {
        const wrongTokensToBatchMint = {
          ids: [nfCollection1], // can't mint a non-fungible collection
          supplies: [new BN(1)],
        };

        await expectRevert(
          safeBatchMint(this.token, owner, wrongTokensToBatchMint.ids, wrongTokensToBatchMint.supplies, '0x', {
            from: minter,
          }),
          revertMessages.NotTokenId
        );
      });

      it('reverts if minting a non-fungible token that already has been minted', async function () {
        const wrongTokensToBatchMint = {
          ids: [nft1, nft2, nft2], // same token id
          supplies: [new BN(1), new BN(1), new BN(1)],
        };

        await expectRevert(
          safeBatchMint(this.token, owner, wrongTokensToBatchMint.ids, wrongTokensToBatchMint.supplies, '0x', {
            from: minter,
          }),
          revertMessages.ExistingOrBurntNFT
        );
      });

      context('when successful', function () {
        beforeEach(async function () {
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
            owner,
            tokensToBatchMint.ids,
            tokensToBatchMint.supplies,
            '0x',
            {from: minter}
          );
        });

        it('should increase thefungible token balances of the owner', async function () {
          (await this.token.balanceOf(owner, fCollection1)).toNumber().should.be.equal(1);
          (await this.token.balanceOf(owner, fCollection2)).toNumber().should.be.equal(2);
          (await this.token.balanceOf(owner, fCollection3)).toNumber().should.be.equal(3);
        });

        it('should emit a TransferBatch event', async function () {
          let totalIdCount = 0;
          for (let log of this.receipt.logs) {
            if (
              log.event === 'TransferBatch' &&
              log.args._operator === minter &&
              log.args._from === ZeroAddress &&
              log.args._to === owner
            ) {
              for (let j = 0; j < tokensToBatchMint.ids.length; ++j) {
                let id = new BN(log.args._ids[j]);
                id.should.be.bignumber.equal(tokensToBatchMint.ids[j]);
                let supply = new BN(log.args._values[j]);
                supply.should.be.bignumber.equal(tokensToBatchMint.supplies[j]);
              }
            }
          }
        });

        it('should assign the NFTs to the new owner', async function () {
          (await this.token.ownerOf(nft1)).should.be.equal(owner);
          (await this.token.ownerOf(nft2)).should.be.equal(owner);
          (await this.token.ownerOf(nft3)).should.be.equal(owner);
        });

        it('should increase the non-fungible token balances of the owner', async function () {
          (await this.token.balanceOf(owner, nft1)).should.be.bignumber.equal('1');
          (await this.token.balanceOf(owner, nft2)).should.be.bignumber.equal('1');
          (await this.token.balanceOf(owner, nft3)).should.be.bignumber.equal('1');
        });

        it('should increase the non-fungible collection balance of the owner', async function () {
          (await this.token.balanceOf(owner, nfCollection1)).should.be.bignumber.equal('1');
          (await this.token.balanceOf(owner, nfCollection2)).should.be.bignumber.equal('2');
        });

        it('should increase the non-fungible token supply', async function () {
          (await this.token.totalSupply(nft1)).should.be.bignumber.equal(this.supplies.nft1.addn(1));
          (await this.token.totalSupply(nft2)).should.be.bignumber.equal(this.supplies.nft2.addn(1));
          (await this.token.totalSupply(nft3)).should.be.bignumber.equal(this.supplies.nft3.addn(1));
        });

        it('should increase the non-fungible collection supply', async function () {
          (await this.token.totalSupply(nfCollection1)).should.be.bignumber.equal(this.supplies.nfCollection1.addn(1));
          (await this.token.totalSupply(nfCollection2)).should.be.bignumber.equal(this.supplies.nfCollection2.addn(2));
        });

        it('should increase the fungible collection supply', async function () {
          (await this.token.totalSupply(fCollection1)).should.be.bignumber.equal(this.supplies.fCollection1.addn(1));
          (await this.token.totalSupply(fCollection2)).should.be.bignumber.equal(this.supplies.fCollection2.addn(2));
          (await this.token.totalSupply(fCollection3)).should.be.bignumber.equal(this.supplies.fCollection3.addn(3));
        });
      });

      context('if the recipient is a contract', function () {
        it('reverts if the contract does not implement ERC1155TokenReceiver', async function () {
          this.receiver = await ReceiverMock.new(false, false, {from: creator});
          await expectRevert.unspecified(
            safeBatchMint(this.token, this.receiver.address, tokensToBatchMint.ids, tokensToBatchMint.supplies, '0x', {
              from: minter,
            })
          );
        });

        it('should emit the ReceivedBatch event', async function () {
          this.receiver = await ReceiverMock.new(false, true, {from: creator});
          this.receipt = await safeBatchMint(
            this.token,
            this.receiver.address,
            tokensToBatchMint.ids,
            tokensToBatchMint.supplies,
            '0x',
            {from: minter}
          );
          await expectEvent.inTransaction(this.receipt.tx, this.receiver, 'ReceivedBatch', {
            operator: minter,
            from: ZeroAddress,
            ids: tokensToBatchMint.ids,
            values: tokensToBatchMint.supplies,
            data: null,
          });
        });
      });
    });
  });
}

module.exports = {
  shouldBehaveLikeERC1155MintableInventory,
};

const {artifacts, accounts} = require('hardhat');
const {BN, expectEvent, expectRevert} = require('@openzeppelin/test-helpers');
const {One, ZeroAddress} = require('@animoca/ethereum-contracts-core_library').constants;

const {makeNonFungibleTokenId} = require('@animoca/blockchain-inventory_metadata').inventoryIds;

const ReceiverMock = artifacts.require('ERC721ReceiverMock');

function shouldBehaveLikeERC721Mintable({
  nfMaskLength,
  mint_ERC721,
  safeMint_ERC721,
  batchMint_ERC721,
  revertMessages,
}) {
  const [creator, minter, nonMinter, owner] = accounts;

  const nft1 = makeNonFungibleTokenId(1, 1, nfMaskLength);
  const nft2 = makeNonFungibleTokenId(2, 1, nfMaskLength);
  const nft3 = makeNonFungibleTokenId(1, 2, nfMaskLength);
  const tokens = [nft1, nft2, nft3];

  describe('like a mintable ERC721', function () {
    beforeEach(async function () {
      await this.token.addMinter(minter, {from: creator});
      this.receiver = await ReceiverMock.new(true, {from: creator});
    });

    context('mint(address,uint256)', function () {
      it('reverts if the sender is not a Minter', async function () {
        await expectRevert(mint_ERC721(this.token, owner, nft1, {from: nonMinter}), revertMessages.NotMinter);
      });

      it('reverts if sent to the zero address', async function () {
        await expectRevert(mint_ERC721(this.token, ZeroAddress, nft1, {from: minter}), revertMessages.TransferToZero);
      });

      it('reverts if the token has already been minted', async function () {
        await mint_ERC721(this.token, owner, nft1, {from: minter});
        await expectRevert(mint_ERC721(this.token, owner, nft1, {from: minter}), revertMessages.ExistingOrBurntNFT);
      });

      context('when successful', function () {
        beforeEach(async function () {
          this.uri = await this.token.uri(nft1);
          this.nftSupply = await this.token.totalSupply(nft1);
          this.receipt = await mint_ERC721(this.token, owner, nft1, {from: minter});
        });

        it('should assign the token to the new owner', async function () {
          (await this.token.ownerOf(nft1)).should.be.equal(owner);
        });

        it('should increase the non-fungible token supply', async function () {
          (await this.token.totalSupply(nft1)).should.be.bignumber.equal(this.nftSupply.addn(1));
        });

        it('should emit the Transfer event', async function () {
          expectEvent(this.receipt, 'Transfer', {
            _from: ZeroAddress,
            _to: owner,
            _tokenId: nft1,
          });
        });
      });

      context('if the recipient is an ERC721Receiver contract', function () {
        it('should NOT emit the Received event', async function () {
          this.receipt = await mint_ERC721(this.token, this.receiver.address, nft1, {from: minter});
          await expectEvent.notEmitted.inTransaction(this.receipt.tx, this.receiver, 'Received', {
            from: ZeroAddress,
            tokenId: nft1,
          });
        });
      });
    });

    context('safeMint(address,uint256)', function () {
      it('reverts if the sender is not a Minter', async function () {
        await expectRevert(safeMint_ERC721(this.token, owner, nft1, '0x', {from: nonMinter}), revertMessages.NotMinter);
      });

      it('reverts if sent to the zero address', async function () {
        await expectRevert(
          safeMint_ERC721(this.token, ZeroAddress, nft1, '0x', {from: minter}),
          revertMessages.TransferToZero
        );
      });

      it('reverts if the token has already been minted', async function () {
        await safeMint_ERC721(this.token, owner, nft1, '0x', {from: minter});
        await expectRevert(
          safeMint_ERC721(this.token, owner, nft1, '0x', {from: minter}),
          revertMessages.ExistingOrBurntNFT
        );
      });

      context('when successful', function () {
        beforeEach(async function () {
          this.uri = await this.token.uri(nft1);
          this.nftSupply = await this.token.totalSupply(nft1);
          this.receipt = await safeMint_ERC721(this.token, owner, nft1, '0x', {from: minter});
        });

        it('should assign the token to the new owner', async function () {
          (await this.token.ownerOf(nft1)).should.be.equal(owner);
        });

        it('should increase the non-fungible token balance of the owner', async function () {
          (await this.token.balanceOf(owner)).should.be.bignumber.equal('1');
        });

        it('should increase the non-fungible token supply', async function () {
          (await this.token.totalSupply(nft1)).should.be.bignumber.equal(this.nftSupply.addn(1));
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
        it('reverts if the contract does not implement ERC721Receiver', async function () {
          await expectRevert.unspecified(safeMint_ERC721(this.token, this.token.address, nft1, '0x', {from: minter}));
        });

        it('should emit the Received event', async function () {
          this.receipt = await safeMint_ERC721(this.token, this.receiver.address, nft1, '0x', {from: minter});
          await expectEvent.inTransaction(this.receipt.tx, this.receiver, 'Received', {
            from: ZeroAddress,
            tokenId: nft1,
            data: null,
          });
        });
      });
    });

    context('batchMint(address,uint256[])', function () {
      it('reverts if the sender is not a Minter', async function () {
        await expectRevert(batchMint_ERC721(this.token, owner, [nft1], {from: nonMinter}), revertMessages.NotMinter);
      });

      it('reverts if sent to the zero address', async function () {
        await expectRevert(
          batchMint_ERC721(this.token, ZeroAddress, [nft1], {from: minter}),
          revertMessages.TransferToZero
        );
      });

      it('reverts if minting a token that already has been minted', async function () {
        await batchMint_ERC721(this.token, owner, [nft1], {from: minter});
        await expectRevert(
          batchMint_ERC721(this.token, owner, [nft1], {from: minter}),
          revertMessages.ExistingOrBurntNFT
        );
      });

      context('when successful', function () {
        beforeEach(async function () {
          this.receipt = await batchMint_ERC721(this.token, owner, tokens, {from: minter});
        });

        it('should emit Transfer events', async function () {
          for (const token of tokens) {
            expectEvent(this.receipt, 'Transfer', {
              _from: ZeroAddress,
              _to: owner,
              _tokenId: token,
            });
          }
        });

        it('should assign the NFTs to the new owner', async function () {
          for (const token of tokens) {
            (await this.token.ownerOf(token)).should.be.equal(owner);
          }
        });

        it('should increase the non-fungible token balances of the owner', async function () {
          (await this.token.balanceOf(owner)).should.be.bignumber.equal(new BN(`${tokens.length}`));
        });
      });

      context('if the recipient is a contract', function () {
        it('should NOT emit the a Received event', async function () {
          this.receipt = await batchMint_ERC721(this.token, this.receiver.address, tokens, {from: minter});
          await expectEvent.notEmitted.inTransaction(this.receipt.tx, this.receiver, 'Received', {
            from: ZeroAddress,
          });
        });
      });
    });
  });
}

module.exports = {
  shouldBehaveLikeERC721Mintable,
};

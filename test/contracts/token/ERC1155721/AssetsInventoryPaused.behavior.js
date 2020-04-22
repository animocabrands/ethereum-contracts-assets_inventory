const { expectRevert } = require('@openzeppelin/test-helpers');

const { ZeroAddress} = require('@animoca/ethereum-contracts-core_library').constants;
const { makeFungibleCollectionId, makeNonFungibleCollectionId, makeNonFungibleTokenId } = require('@animoca/blockchain-inventory_metadata').inventoryIds;

function shouldBehaveLikeAssetsInventoryPaused(
  nfMaskLength,
  owner,
  [recipient, operator]
) {
  const fCollection = {
    id: makeFungibleCollectionId(1),
    supply: 10
  };
  const nfCollection = makeNonFungibleCollectionId(1, nfMaskLength);
  const nft = makeNonFungibleTokenId(1, 1, nfMaskLength);

  const mockData = '0x42';

  describe('like a paused ERC721', function () {
    beforeEach(async function () {
      await this.token.mintNonFungible(owner, nft, { from: owner });
    });

    it('reverts when trying to approve', async function () {
      await expectRevert.unspecified(this.token.approve(recipient, nft, { from: owner }));
    });

    it('reverts when trying to setApprovalForAll', async function () {
      await expectRevert.unspecified(this.token.setApprovalForAll(operator, true, { from: owner }));
    });

    it('reverts when trying to transferFrom', async function () {
      await expectRevert.unspecified(this.token.transferFrom(owner, recipient, nft, { from: owner }));
    });

    it('reverts when trying to safeTransferFrom', async function () {
      await expectRevert.unspecified(
        this.token.methods['safeTransferFrom(address,address,uint256)'](owner, recipient, nft, { from: owner }));
    });

    it('reverts when trying to safeTransferFrom with data', async function () {
      await expectRevert.unspecified(
        this.token.methods['safeTransferFrom(address,address,uint256,bytes)'](owner, recipient, nft, mockData, { from: owner }));
    });

    describe('getApproved', function () {
      it('returns approved address', async function () {
        const approvedAccount = await this.token.getApproved(nft);
        approvedAccount.should.be.equal(ZeroAddress);
      });
    });

    describe('balanceOf', function () {
      it('returns the amount of tokens owned by the given address', async function () {
        const balance = await this.token.balanceOf(owner);
        balance.should.be.bignumber.equal('1');
      });
    });

    describe('ownerOf', function () {
      it('returns the amount of tokens owned by the given address', async function () {
        const ownerOfToken = await this.token.ownerOf(nft);
        ownerOfToken.should.be.equal(owner);
      });
    });

    describe('exists', function () {
      it('should return token existence', async function () {
        (await this.token.exists(nft)).should.equal(true);
      });
    });

    describe('isApprovedForAll', function () {
      it('returns the approval of the operator', async function () {
        (await this.token.isApprovedForAll(owner, operator)).should.equal(false);
      });
    });
  });

  describe('like a paused ERC1155', function () {
    beforeEach(async function () {
      await this.token.mintNonFungible(owner, nft, { from: owner });
      await this.token.mintFungible(owner, fCollection.id, fCollection.supply, { from: owner });
    });

    context("fungibles", function () {
      it('reverts when trying to safeTransferFrom with data', async function () {
        await expectRevert.unspecified(this.token.methods['safeTransferFrom(address,address,uint256,uint256,bytes)'](
          owner, recipient, nft, 1, mockData, { from: owner })
        );
      });

      it('reverts when trying to safeBatchTransferFrom with data', async function () {
        await expectRevert.unspecified(this.token.methods['safeBatchTransferFrom(address,address,uint256[],uint256[],bytes)'](
          owner, recipient, [nft], [1], mockData, { from: owner })
        );
      });

      describe('balanceOf (NFT)', async function () {
        it('returns the amount of tokenId owned by the given address', async function () {
          const balance = await this.token.balanceOf(owner, nft);
          balance.should.be.bignumber.equal('1');
        });

        it('returns the amount of collectionId owned by the given address', async function () {
          const balance = await this.token.balanceOf(owner, nfCollection);
          balance.should.be.bignumber.equal('1');
        });
      });

      describe('balanceOfBatch', function () {
        it('returns the amount of tokenIds owned by the given addresses', async function () {
          const balances = await this.token.balanceOfBatch([owner], [nft]);
          balances.map(t => t.toNumber()).should.have.members([1]);
        });

        it('returns the amount of collectionId owned by the given addresses', async function () {
          const balances = await this.token.balanceOfBatch([owner], [nfCollection]);
          balances.map(t => t.toNumber()).should.have.members([1]);
        });
      });
    });

    context("non-fungibles", function () {
      it('reverts when trying to safeTransferFrom with data', async function () {
        await expectRevert.unspecified(this.token.methods['safeTransferFrom(address,address,uint256,uint256,bytes)'](
          owner, recipient, fCollection.id, 2, mockData, { from: owner })
        );
      });

      it('reverts when trying to safeBatchTransferFrom with data', async function () {
        await expectRevert.unspecified(this.token.methods['safeBatchTransferFrom(address,address,uint256[],uint256[],bytes)'](
          owner, recipient, [fCollection.id], [2], mockData, { from: owner })
        );
      });

      describe('balanceOf', function () {
        it('returns the amount of collectionId owned by the given address', async function () {
          const balance = await this.token.balanceOf(owner, fCollection.id);
          // balance.toNumber().should.be.equal(fCollection.supply);
          balance.should.be.bignumber.equal(`${fCollection.supply}`);
        });
      });

      describe('balanceOfBatch', function () {
        it('returns the amount of collectionId owned by the given addresses', async function () {
          const balances = await this.token.balanceOfBatch([owner], [fCollection.id]);
          balances.map(t => t.toNumber()).should.have.members([fCollection.supply]);
        });
      });
    });
  });
}

module.exports = {
  shouldBehaveLikeAssetsInventoryPaused,
};

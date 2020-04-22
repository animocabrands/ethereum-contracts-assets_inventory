const { expectRevert } = require('@openzeppelin/test-helpers');
const { makeFungibleCollectionId, makeNonFungibleCollectionId, makeNonFungibleTokenId } = require('@animoca/blockchain-inventory_metadata').inventoryIds;

function shouldBehaveLikeERC1155PausableCollections(nfMaskLength, creator, [owner, recipient]) {

    const mockData = '0x42';

    const fCollection1 = {
        id: makeFungibleCollectionId(1),
        supply: 1
    };
    const fCollection2 = {
        id: makeFungibleCollectionId(2),
        supply: 1
    };

    const nfCollection1 = makeNonFungibleCollectionId(1, nfMaskLength);
    const nfCollection2 = makeNonFungibleCollectionId(2, nfMaskLength);
    const nft1 = makeNonFungibleTokenId(1, 1, nfMaskLength);
    const nft2 = makeNonFungibleTokenId(1, 2, nfMaskLength);
    const nft3 = makeNonFungibleTokenId(2, 2, nfMaskLength);

    describe('like an ERC1155PausableCollections', function () {
        beforeEach(async function () {
            await this.token.createCollection(fCollection1.id, { from: creator });
            await this.token.createCollection(fCollection2.id, { from: creator });
            await this.token.createCollection(nfCollection1, { from: creator });
            await this.token.createCollection(nfCollection2, { from: creator });

            await this.token.mintFungible(owner, fCollection1.id, fCollection1.supply, { from: creator });
            await this.token.mintFungible(owner, fCollection2.id, fCollection2.supply, { from: creator });
            await this.token.mintNonFungible(owner, nft1, { from: creator });
            await this.token.mintNonFungible(owner, nft2, { from: creator });
            await this.token.mintNonFungible(owner, nft3, { from: creator });
        });

        context("fungible collection 1 paused", function () {
            beforeEach(async function () {
                await this.token.pauseCollections([fCollection1.id], { from: creator });
            });

            it("should allow transfers for other collections", async function () {
                await this.token.methods['safeTransferFrom(address,address,uint256,uint256,bytes)'](owner, recipient, fCollection2.id, "1", mockData, { from: owner });
                await this.token.safeTransferFrom(owner, recipient, nft1, { from: owner });
                await this.token.safeTransferFrom(owner, recipient, nft3, { from: owner });
            });

            it("should block transfers for this collection", async function () {
                await expectRevert.unspecified(this.token.methods['safeTransferFrom(address,address,uint256,uint256,bytes)'](owner, recipient, fCollection1.id, "1", mockData, { from: owner }));
            });

            it("should allow again after unpausing", async function () {
                await this.token.unpauseCollections([fCollection1.id], { from: creator });
                await this.token.methods['safeTransferFrom(address,address,uint256,uint256,bytes)'](owner, recipient, fCollection1.id, "1", mockData, { from: owner });
            });
        });

        context("non-fungible collection 1 paused", function () {
            beforeEach(async function () {
                await this.token.pauseCollections([nfCollection1], { from: creator });
            });

            it("should allow transfers for other collections", async function () {
                await this.token.methods['safeTransferFrom(address,address,uint256,uint256,bytes)'](owner, recipient, fCollection1.id, "1", mockData, { from: owner });
                await this.token.methods['safeTransferFrom(address,address,uint256,uint256,bytes)'](owner, recipient, fCollection2.id, "1", mockData, { from: owner });
                await this.token.safeTransferFrom(owner, recipient, nft2, { from: owner });
                await this.token.safeTransferFrom(owner, recipient, nft3, { from: owner });
            });

            it("should block transfers for this collection", async function () {
                await expectRevert.unspecified(this.token.safeTransferFrom(owner, recipient, nft1, { from: owner }));
            });

            it("should allow again after unpausing", async function () {
                await this.token.unpauseCollections([nfCollection1], { from: creator });
                await this.token.safeTransferFrom(owner, recipient, nft1, { from: owner });
            });
        });

        context("fungible collection 2 & non-fungible collection 2 paused", function () {
            beforeEach(async function () {
                await this.token.pauseCollections([nfCollection2, fCollection2.id], { from: creator });
            });

            it("should allow transfers for other collections", async function () {
                await this.token.methods['safeTransferFrom(address,address,uint256,uint256,bytes)'](owner, recipient, fCollection1.id, "1", mockData, { from: owner });
                await this.token.safeTransferFrom(owner, recipient, nft1, { from: owner });
            });

            it("should block transfers for these collection", async function () {
                await expectRevert.unspecified(this.token.methods['safeTransferFrom(address,address,uint256,uint256,bytes)'](owner, recipient, fCollection2.id, "1", mockData, { from: owner }));
                await expectRevert.unspecified(this.token.safeTransferFrom(owner, recipient, nft2, { from: owner }));
                await expectRevert.unspecified(this.token.safeTransferFrom(owner, recipient, nft3, { from: owner }));
            });

            it("should allow fungible collection 2 again after unpausing", async function () {
                await this.token.unpauseCollections([fCollection2.id], { from: creator });

                await this.token.methods['safeTransferFrom(address,address,uint256,uint256,bytes)'](owner, recipient, fCollection2.id, "1", mockData, { from: owner });
                await this.token.methods['safeTransferFrom(address,address,uint256,uint256,bytes)'](owner, recipient, fCollection1.id, "1", mockData, { from: owner });
                await this.token.safeTransferFrom(owner, recipient, nft1, { from: owner });
                await expectRevert.unspecified(this.token.safeTransferFrom(owner, recipient, nft2, { from: owner }));
                await expectRevert.unspecified(this.token.safeTransferFrom(owner, recipient, nft3, { from: owner }));
            });

            it("should allow non-fungible collection 2 again after unpausing", async function () {
                await this.token.unpauseCollections([nfCollection2], { from: creator });

                await this.token.methods['safeTransferFrom(address,address,uint256,uint256,bytes)'](owner, recipient, fCollection1.id, "1", mockData, { from: owner });
                await expectRevert.unspecified(this.token.methods['safeTransferFrom(address,address,uint256,uint256,bytes)'](owner, recipient, fCollection2.id, "1", mockData, { from: owner }));
                await this.token.safeTransferFrom(owner, recipient, nft1, { from: owner });
                await this.token.safeTransferFrom(owner, recipient, nft2, { from: owner });
                await this.token.safeTransferFrom(owner, recipient, nft3, { from: owner });
            });
        });
    });
}

module.exports = {
    shouldBehaveLikeERC1155PausableCollections,
};

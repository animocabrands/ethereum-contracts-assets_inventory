const { expectRevert } = require('@openzeppelin/test-helpers');
const { makeFungibleCollectionId, makeNonFungibleCollectionId, makeNonFungibleTokenId } = require('@animoca/blockchain-inventory_metadata').inventoryIds;

const Paused_RevertMessage = 'Pausable: paused';
const IdIsPaused_RevertMessage = 'PausableCollections: id is paused';

function shouldBehaveLikeERC1155PausableInventory(
    {nfMaskLength, mint},
    [creator, owner, recipient, operator]
) {

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

    describe('like a pausable ERC1155Inventory', function () {
        beforeEach(async function () {
            await this.token.createCollection(fCollection1.id, { from: creator });
            await this.token.createCollection(fCollection2.id, { from: creator });
            await this.token.createCollection(nfCollection1, { from: creator });
            await this.token.createCollection(nfCollection2, { from: creator });

            await mint(this.token, owner, fCollection1.id, fCollection1.supply, '0x', { from: creator });
            await mint(this.token, owner, fCollection2.id, fCollection2.supply, '0x', { from: creator });
            await mint(this.token, owner, nft1, 1, '0x', { from: creator });
            await mint(this.token, owner, nft2, 1, '0x', { from: creator });
            await mint(this.token, owner, nft3, 1, '0x', { from: creator });
        });
        
        describe('PausableCollections', function () {
            context("fungible token 1 paused", function () {
                beforeEach(async function () {
                    await this.token.pauseCollections([fCollection1.id], { from: creator });
                });

                it("should allow transfers for other collections", async function () {
                    await this.token.methods['safeTransferFrom(address,address,uint256,uint256,bytes)'](owner, recipient, fCollection2.id, '1', mockData, { from: owner });
                    await this.token.methods['safeTransferFrom(address,address,uint256,uint256,bytes)'](owner, recipient, nft1, '1', mockData, { from: owner });
                    await this.token.methods['safeTransferFrom(address,address,uint256,uint256,bytes)'](owner, recipient, nft3, '1', mockData, { from: owner });
                });

                it("should block transfers for this collection", async function () {
                    await expectRevert(
                        this.token.methods['safeTransferFrom(address,address,uint256,uint256,bytes)'](owner, recipient, fCollection1.id, '1', mockData, { from: owner }),
                        IdIsPaused_RevertMessage
                    );
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
                    await this.token.methods['safeTransferFrom(address,address,uint256,uint256,bytes)'](owner, recipient, nft2, '1', mockData, { from: owner });
                    await this.token.methods['safeTransferFrom(address,address,uint256,uint256,bytes)'](owner, recipient, nft3, '1', mockData, { from: owner });
                });

                it("should block transfers for this collection", async function () {
                    await expectRevert(
                        this.token.methods['safeTransferFrom(address,address,uint256,uint256,bytes)'](owner, recipient, nft1, '1', mockData, { from: owner }),
                        IdIsPaused_RevertMessage
                    );
                });

                it("should allow again after unpausing", async function () {
                    await this.token.unpauseCollections([nfCollection1], { from: creator });
                    await this.token.methods['safeTransferFrom(address,address,uint256,uint256,bytes)'](owner, recipient, nft1, '1', mockData, { from: owner });
                });
            });

            context("fungible token 2 & non-fungible collection 2 paused", function () {
                beforeEach(async function () {
                    await this.token.pauseCollections([nfCollection2, fCollection2.id], { from: creator });
                });

                it("should allow transfers for other collections", async function () {
                    await this.token.methods['safeTransferFrom(address,address,uint256,uint256,bytes)'](owner, recipient, fCollection1.id, "1", mockData, { from: owner });
                    await this.token.methods['safeTransferFrom(address,address,uint256,uint256,bytes)'](owner, recipient, nft1, '1', mockData, { from: owner });
                });

                it("should block transfers for these collection", async function () {
                    await expectRevert(
                        this.token.methods['safeTransferFrom(address,address,uint256,uint256,bytes)'](owner, recipient, fCollection2.id, "1", mockData, { from: owner }),
                        IdIsPaused_RevertMessage
                    );
                    await expectRevert(
                        this.token.methods['safeTransferFrom(address,address,uint256,uint256,bytes)'](owner, recipient, nft2, '1', mockData, { from: owner }),
                        IdIsPaused_RevertMessage
                    );
                    await expectRevert(
                        this.token.methods['safeTransferFrom(address,address,uint256,uint256,bytes)'](owner, recipient, nft3, '1', mockData, { from: owner }),
                        IdIsPaused_RevertMessage
                    );
                });

                it("should allowfungible token 2 again after unpausing", async function () {
                    await this.token.unpauseCollections([fCollection2.id], { from: creator });

                    await this.token.methods['safeTransferFrom(address,address,uint256,uint256,bytes)'](owner, recipient, fCollection2.id, "1", mockData, { from: owner });
                    await this.token.methods['safeTransferFrom(address,address,uint256,uint256,bytes)'](owner, recipient, fCollection1.id, "1", mockData, { from: owner });
                    await this.token.methods['safeTransferFrom(address,address,uint256,uint256,bytes)'](owner, recipient, nft1, '1', mockData, { from: owner });
                    await expectRevert(
                        this.token.methods['safeTransferFrom(address,address,uint256,uint256,bytes)'](owner, recipient, nft2, '1', mockData, { from: owner }),
                        IdIsPaused_RevertMessage
                    );
                    await expectRevert(
                        this.token.methods['safeTransferFrom(address,address,uint256,uint256,bytes)'](owner, recipient, nft3, '1', mockData, { from: owner }),
                        IdIsPaused_RevertMessage
                    );
                });

                it("should allow non-fungible collection 2 again after unpausing", async function () {
                    await this.token.unpauseCollections([nfCollection2], { from: creator });

                    await this.token.methods['safeTransferFrom(address,address,uint256,uint256,bytes)'](owner, recipient, fCollection1.id, "1", mockData, { from: owner });
                    await expectRevert(
                        this.token.methods['safeTransferFrom(address,address,uint256,uint256,bytes)'](owner, recipient, fCollection2.id, "1", mockData, { from: owner }),
                        IdIsPaused_RevertMessage
                    );
                    await this.token.methods['safeTransferFrom(address,address,uint256,uint256,bytes)'](owner, recipient, nft1, '1', mockData, { from: owner });
                    await this.token.methods['safeTransferFrom(address,address,uint256,uint256,bytes)'](owner, recipient, nft2, '1', mockData, { from: owner });
                    await this.token.methods['safeTransferFrom(address,address,uint256,uint256,bytes)'](owner, recipient, nft3, '1', mockData, { from: owner });
                });
            });
        });

        describe('Pausable', function () {
            context('when not paued', function () {
                it('allows setApprovalForAll', async function () {
                    await this.token.setApprovalForAll(operator, true, { from: owner });
                });

                it('allows safeTransferFrom', async function () {
                    await this.token.methods['safeTransferFrom(address,address,uint256,uint256,bytes)'](owner, recipient, fCollection2.id, '1', mockData, { from: owner });
                    await this.token.methods['safeTransferFrom(address,address,uint256,uint256,bytes)'](owner, recipient, nft1, '1', mockData, { from: owner });
                    await this.token.methods['safeTransferFrom(address,address,uint256,uint256,bytes)'](owner, recipient, nft3, '1', mockData, { from: owner });
                    await this.token.methods['safeTransferFrom(address,address,uint256,uint256,bytes)'](owner, recipient, fCollection1.id, '1', mockData, { from: owner });
                });

                it('allows safeBatchTransferFrom', async function () {
                    const ids = [fCollection2.id, nft1, nft3, fCollection1.id];
                    const values = ['1', '1', '1', '1'];

                    await this.token.safeBatchTransferFrom(owner, recipient, ids, values, mockData, { from: owner });
                });

                it('allows burnFrom', async function () {
                    await this.token.burnFrom(owner, fCollection2.id, '1', { from: owner });
                    await this.token.burnFrom(owner, nft1, '1', { from: owner });
                    await this.token.burnFrom(owner, nft3, '1', { from: owner });
                    await this.token.burnFrom(owner, fCollection1.id, '1', { from: owner });
                });
            });

            context('when paused', function () {

                beforeEach(async function () {
                    await this.token.pause({from: creator});
                });

                it('blocks setApprovalForAll', async function () {
                    await expectRevert(
                        this.token.setApprovalForAll(operator, true, { from: owner }),
                        Paused_RevertMessage
                    );
                });

                it('blocks safeTransferFrom', async function () {
                    await expectRevert(
                        this.token.methods['safeTransferFrom(address,address,uint256,uint256,bytes)'](owner, recipient, fCollection2.id, '1', mockData, { from: owner }),
                        Paused_RevertMessage
                    );
                    await expectRevert(
                        this.token.methods['safeTransferFrom(address,address,uint256,uint256,bytes)'](owner, recipient, nft1, '1', mockData, { from: owner }),
                        Paused_RevertMessage
                    );
                    await expectRevert(
                        this.token.methods['safeTransferFrom(address,address,uint256,uint256,bytes)'](owner, recipient, nft3, '1', mockData, { from: owner }),
                        Paused_RevertMessage
                    );
                    await expectRevert(
                        this.token.methods['safeTransferFrom(address,address,uint256,uint256,bytes)'](owner, recipient, fCollection1.id, '1', mockData, { from: owner }),
                        Paused_RevertMessage
                    );
                });

                it('blocks safeBatchTransferFrom', async function () {
                    const ids = [fCollection2.id, nft1, nft3, fCollection1.id];
                    const values = ['1', '1', '1', '1'];

                    await expectRevert(
                        this.token.safeBatchTransferFrom(owner, recipient, ids, values, mockData, { from: owner }),
                        Paused_RevertMessage
                    );
                });

                it('blocks burnFrom', async function () {
                    await expectRevert(
                        this.token.burnFrom(owner, fCollection2.id, '1', { from: owner }),
                        Paused_RevertMessage
                    );
                    await expectRevert(
                        this.token.burnFrom(owner, nft1, '1', { from: owner }),
                        Paused_RevertMessage
                    );
                    await expectRevert(
                        this.token.burnFrom(owner, nft3, '1', { from: owner }),
                        Paused_RevertMessage
                    );
                    await expectRevert(
                        this.token.burnFrom(owner, fCollection1.id, '1', { from: owner }),
                        Paused_RevertMessage
                    );
                });
            });
        });
    });
}

module.exports = {
    shouldBehaveLikeERC1155PausableInventory,
};

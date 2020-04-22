const { BN } = require('@openzeppelin/test-helpers');
const { ZeroAddress } = require('@animoca/ethereum-contracts-core_library').constants;
const { makeFungibleCollectionId, makeNonFungibleCollectionId, makeNonFungibleTokenId } = require('@animoca/blockchain-inventory_metadata').inventoryIds;

function shouldBehaveLikeAssetsInventoryBurnable(
    nfMaskLength,
    creator,
    [owner, other]
) {
    const nfCollection = makeNonFungibleCollectionId(1, nfMaskLength);
    const nft = makeNonFungibleTokenId(1, 1, nfMaskLength);

    beforeEach(async function () {
        await this.token.createCollection(nfCollection, { from: creator });
        await this.token.mintNonFungible(owner, nft, { from: creator });
    });

    async function testBurnNft(contract, transferFunction) {
        const ownerOf = await contract.ownerOf(nft);
        const collectionBalanceBefore = await contract.balanceOf(owner, nfCollection);
        const nftBalanceBefore = await contract.balanceOf(owner);
        const existsBefore = await contract.exists(nft);

        ownerOf.should.be.equal(owner);
        existsBefore.should.be.true;

        await transferFunction(contract);

        const collectionBalanceAfter = await contract.balanceOf(owner, nfCollection);
        const nftBalanceAfter = await contract.balanceOf(owner);
        const existsAfter = await contract.exists(nft);

        collectionBalanceAfter.should.be.bignumber.equal(collectionBalanceBefore.subn(1));
        nftBalanceAfter.should.be.bignumber.equal(nftBalanceBefore.subn(1));
        existsAfter.should.be.false;
    }

    describe('like a burnable ERC721', function () {
        describe('transfer from', function () {
            it('burns', async function () {
                await testBurnNft(this.token, async function(contract) {
                    await contract.methods['transferFrom(address,address,uint256)'](owner, ZeroAddress, nft, { from: owner });
                });
            });
        });

        describe('safe transfer without data', function () {
            it ('burns', async function () {
                await testBurnNft(this.token, async function(contract) {
                    await contract.methods['safeTransferFrom(address,address,uint256)'](owner, ZeroAddress, nft, { from: owner });
                });
            });
        });

        describe('safe transfer with data', function () {
            const data = '0x42';

            it ('burns', async function () {
                await testBurnNft(this.token, async function(contract) {
                    await contract.methods['safeTransferFrom(address,address,uint256,bytes)'](owner, ZeroAddress, nft, data, { from: owner });
                });
            });
        });
    });

    describe('like a burnable ERC1155', function () {
        const fCollection = makeFungibleCollectionId(1);
        const amount = new BN(10);
        const data = '0x42';

        beforeEach(async function () {
            await this.token.createCollection(fCollection, { from: creator });
            await this.token.mintFungible(owner, fCollection, new BN(100), { from: creator });
        });

        async function testBurnFt(contract, transferFunction) {
            const collectionBalanceBefore = await contract.balanceOf(owner, fCollection);

            await transferFunction(contract);

            const collectionBalanceAfter = await contract.balanceOf(owner, fCollection);

            collectionBalanceAfter.should.be.bignumber.equal(collectionBalanceBefore.sub(amount));
        }

        describe('safe transfer from', function () {
            context('with a Non Fungible Token', function () {
                it('burns', async function () {
                    await testBurnNft(this.token, async function(contract) {
                        await contract.methods['safeTransferFrom(address,address,uint256,uint256,bytes)'](owner, ZeroAddress, nft, new BN(1), data, { from: owner });
                    });
                });
            });

            context('with a Fungible Token', function () {
                it('burns', async function () {
                    await testBurnFt(this.token, async function(contract) {
                        await contract.methods['safeTransferFrom(address,address,uint256,uint256,bytes)'](owner, ZeroAddress, fCollection, amount, data, { from: owner });
                    });
                });
            });
        });

        describe('safe batch transfer from', function () {
            context('with a Non Fungible Token', function () {
                it('burns', async function () {
                    await testBurnNft(this.token, async function(contract) {
                        await contract.methods['safeBatchTransferFrom(address,address,uint256[],uint256[],bytes)'](owner, ZeroAddress, [nft], [new BN(1)], data, { from: owner });
                    });
                });
            });

            context('with a Fungible Token', function () {
                it('burns', async function () {
                    await testBurnFt(this.token, async function(contract) {
                        await contract.methods['safeBatchTransferFrom(address,address,uint256[],uint256[],bytes)'](owner, ZeroAddress, [fCollection], [amount], data, { from: owner });
                    });
                });
            });

            context('with both Fungible and Non Fungible Tokens', function () {
                it('burns', async function () {
                    const ownerOf = await this.token.ownerOf(nft);
                    const ftCollectionBalanceBefore = await this.token.balanceOf(owner, fCollection);
                    const nftCollectionBalanceBefore = await this.token.balanceOf(owner, nfCollection);
                    const nftBalanceBefore = await this.token.balanceOf(owner);
                    const existsBefore = await this.token.exists(nft);

                    ownerOf.should.be.equal(owner);
                    existsBefore.should.be.true;

                    await this.token.methods['safeBatchTransferFrom(address,address,uint256[],uint256[],bytes)'](owner, ZeroAddress, [fCollection, nft], [amount, new BN(1)], data, { from: owner });

                    const ftCollectionBalanceAfter = await this.token.balanceOf(owner, fCollection);
                    const nftCollectionBalanceAfter = await this.token.balanceOf(owner, nfCollection);
                    const nftBalanceAfter = await this.token.balanceOf(owner);
                    const existsAfter = await this.token.exists(nft);

                    ftCollectionBalanceAfter.should.be.bignumber.equal(ftCollectionBalanceBefore.sub(amount));
                    nftCollectionBalanceAfter.should.be.bignumber.equal(nftCollectionBalanceBefore.subn(1));
                    nftBalanceAfter.should.be.bignumber.equal(nftBalanceBefore.subn(1));
                    existsAfter.should.be.false;
                });
            })
        });
    });
}

module.exports = {
    shouldBehaveLikeAssetsInventoryBurnable,
};

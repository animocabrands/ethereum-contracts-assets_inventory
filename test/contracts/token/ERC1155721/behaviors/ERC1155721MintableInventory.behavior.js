const { One, Two, Three, Zero } = require('@animoca/ethereum-contracts-core_library/src/constants');
const { contract } = require('@openzeppelin/test-environment');
const { BN, expectEvent, expectRevert } = require('@openzeppelin/test-helpers');
const { ZeroAddress, EmptyByte } = require('@animoca/ethereum-contracts-core_library').constants;

const {
    makeFungibleCollectionId,
    makeNonFungibleCollectionId,
    makeNonFungibleTokenId,
    getNonFungibleBaseCollectionId
} = require('@animoca/blockchain-inventory_metadata').inventoryIds;

// TODO add specific 1155721 receiver logic on minting
const ReceiverMock = contract.fromArtifact('ERC1155721ReceiverMock');

function shouldBehaveLikeERC1155721MintableInventory(
    {nfMaskLength, mint, batchMint},
    [creator, minter, nonMinter, owner, newOwner, approved]
) {
    const fCollection1 = makeFungibleCollectionId(1);
    const fCollection2 = makeFungibleCollectionId(2);
    const fCollection3 = makeFungibleCollectionId(3);
    const nfCollection1 = makeNonFungibleCollectionId(1, nfMaskLength);
    const nfCollection2 = makeNonFungibleCollectionId(2, nfMaskLength);
    const nft1 = makeNonFungibleTokenId(1, getNonFungibleBaseCollectionId(nfCollection1, nfMaskLength), nfMaskLength);
    const nft2 = makeNonFungibleTokenId(1, getNonFungibleBaseCollectionId(nfCollection2, nfMaskLength), nfMaskLength);
    const nft3 = makeNonFungibleTokenId(2, getNonFungibleBaseCollectionId(nfCollection2, nfMaskLength), nfMaskLength);

    const tokensToBatchMint = {
        ids: [nft1, nft2, nft3, fCollection1, fCollection2, fCollection3],
        supplies: [new BN(1), new BN(1), new BN(1), new BN(1), new BN(2), new BN(3)]
    }

    describe('like a mintable ERC1155721Inventory', function () {
        beforeEach(async function () {
            await this.token.addMinter(minter, { from: creator });
        });

        // TODO add 721 special minting
        context('mintNonFungible', function () {
            beforeEach(async function () {
                this.nftBalance = await this.token.balanceOf(owner);
                this.receipt = await mint(this.token, owner, nft1, 1, '0x', { from: minter });
            });

            it('should increase the non-fungible token balance of the owner', async function () {
                (await this.token.balanceOf(owner)).should.be.bignumber.equal(this.nftBalance.add(One));
            });

            it('should emit the Transfer event', async function () {
                expectEvent(this.receipt, 'Transfer', {
                    _from: ZeroAddress,
                    _to: owner,
                    _tokenId: nft1,
                });
            });
        });

        context('batchMint', function () {
            it('should revert if the sender is not a Minter', async function () {
                await expectRevert.unspecified(batchMint(this.token, owner, tokensToBatchMint.ids, tokensToBatchMint.supplies, '0x', { from: nonMinter }));
            });

            it('should revert if the fungible quantity is less than 1', async function () {
                await expectRevert.unspecified(batchMint(this.token, owner, [fCollection1], [new BN(0)], '0x', { from: minter }));
            });

            it('it should revert if the non-fungible quantity is greater than 1', async function () {
                await expectRevert.unspecified(batchMint(this.token, owner, [nft1], [Two], '0x', { from: minter }));
            });

            it('it should revert if the non-fungible quantity is less than 1', async function () {
                await expectRevert.unspecified(batchMint(this.token, owner, [nft1], [Zero], '0x', { from: minter }));
            });

            it('it should revert if there is a mismatch in the param array lengths', async function () {
                const wrongTokensToBatchMint = {
                    ids: [nft1, nft2, nft3],
                    supplies: [new BN(1), new BN(1)]
                }

                await expectRevert.unspecified(batchMint(
                    this.token,
                    owner,
                    wrongTokensToBatchMint.ids,
                    wrongTokensToBatchMint.supplies,
                    '0x',
                    { from: minter })
                );
            });

            it('should revert if minting a collection', async function () {
                const wrongTokensToBatchMint = {
                    ids: [nfCollection1], // can't mint a non-fungible collection
                    supplies: [new BN(1)]
                }

                await expectRevert.unspecified(batchMint(
                    this.token,
                    owner,
                    wrongTokensToBatchMint.ids,
                    wrongTokensToBatchMint.supplies,
                    '0x',
                    { from: minter })
                );
            });

            it('should revert if minting a non-fungible token that already has been minted', async function () {
                const wrongTokensToBatchMint = {
                    ids: [nft1, nft2, nft2], // same token id
                    supplies: [new BN(1), new BN(1), new BN(1)]
                }

                await expectRevert.unspecified(batchMint(
                    this.token,
                    owner,
                    wrongTokensToBatchMint.ids,
                    wrongTokensToBatchMint.supplies,
                    '0x',
                    { from: minter })
                );
            });

            context('when successful', function () {
                beforeEach(async function () {
                    this.nftBalance = await this.token.balanceOf(owner);
                    this.receipt = await batchMint(
                        this.token,
                        owner,
                        tokensToBatchMint.ids,
                        tokensToBatchMint.supplies,
                        '0x',
                        { from: minter }
                    );
                });

                it('should increase the non-fungible token balance of the owner', async function () {
                    (await this.token.balanceOf(owner)).should.be.bignumber.equal(this.nftBalance.add(Three));
                });

                it('should emit Transfer events', async function () {
                    expectEvent(this.receipt, 'Transfer', {
                        _from: ZeroAddress,
                        _to: owner,
                        _tokenId: nft1,
                    });
                    expectEvent(this.receipt, 'Transfer', {
                        _from: ZeroAddress,
                        _to: owner,
                        _tokenId: nft2,
                    });
                    expectEvent(this.receipt, 'Transfer', {
                        _from: ZeroAddress,
                        _to: owner,
                        _tokenId: nft3,
                    });
                });
            });
        });
    });
}

module.exports = {
    shouldBehaveLikeERC1155721MintableInventory,
};

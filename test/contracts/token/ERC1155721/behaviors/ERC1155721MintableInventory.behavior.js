const { One, Three } = require('@animoca/ethereum-contracts-core_library/src/constants');
const { contract } = require('@openzeppelin/test-environment');
const { BN, expectEvent, expectRevert } = require('@openzeppelin/test-helpers');
const { ZeroAddress, EmptyByte } = require('@animoca/ethereum-contracts-core_library').constants;

const {
    makeFungibleCollectionId,
    makeNonFungibleCollectionId,
    makeNonFungibleTokenId,
    getNonFungibleBaseCollectionId
} = require('@animoca/blockchain-inventory_metadata').inventoryIds;

const ReceiverMock = contract.fromArtifact('ERC1155721ReceiverMock');

function shouldBehaveLikeERC1155721MintableInventory(
    nfMaskLength,
    newABI,
    creator,
    [minter, nonMinter, owner, newOwner, approved]
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

        context('mintNonFungible', function () {
            beforeEach(async function () {
                this.nftBalance = await this.token.balanceOf(owner);
                if (newABI) {
                    this.receipt = await this.token.mint(owner, nft1, 1, EmptyByte, true, { from: minter });
                } else {
                    this.receipt = await this.token.mintNonFungible(owner, nft1, { from: minter });
                }
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
                if (newABI) {
                    await expectRevert.unspecified(this.token.batchMint(owner, tokensToBatchMint.ids, tokensToBatchMint.supplies, EmptyByte, true, { from: nonMinter }));
                } else {
                    await expectRevert.unspecified(this.token.batchMint(owner, tokensToBatchMint.ids, tokensToBatchMint.supplies, { from: nonMinter }));
                }
            });

            it('should revert if the fungible quantity is less than 1', async function () {
                if (newABI) {
                    await expectRevert.unspecified(this.token.batchMint(owner, [fCollection1], [new BN(0)], EmptyByte, true, { from: minter }));
                } else {
                    await expectRevert.unspecified(this.token.batchMint(owner, [fCollection1], [new BN(0)], { from: minter }));
                }
            });

            it('it should revert if the non-fungible quantity is greater than 1', async function () {
                if (newABI) {
                    await expectRevert.unspecified(this.token.batchMint(owner, [nft1], [new BN(2)], EmptyByte, true, { from: minter }));
                } else {
                    await expectRevert.unspecified(this.token.batchMint(owner, [nft1], [new BN(2)], { from: minter }));
                }
            });

            it('it should revert if the non-fungible quantity is less than 1', async function () {
                if (newABI) {
                    await expectRevert.unspecified(this.token.batchMint(owner, [nft1], [new BN(0)], EmptyByte, true, { from: minter }));
                } else {
                    await expectRevert.unspecified(this.token.batchMint(owner, [nft1], [new BN(0)], { from: minter }));
                }
            });

            it('it should revert if there is a mismatch in the param array lengths', async function () {
                const wrongTokensToBatchMint = {
                    ids: [nft1, nft2, nft3],
                    supplies: [new BN(1), new BN(1)]
                }

                if (newABI) {
                    await expectRevert.unspecified(this.token.batchMint(
                        owner,
                        wrongTokensToBatchMint.ids,
                        wrongTokensToBatchMint.supplies,
                        EmptyByte,
                        true,
                        { from: minter })
                    );
                } else {
                    await expectRevert.unspecified(this.token.batchMint(
                        owner,
                        wrongTokensToBatchMint.ids,
                        wrongTokensToBatchMint.supplies,
                        { from: minter })
                    );
                    
                }
            });

            it('should revert if minting a collection', async function () {
                const wrongTokensToBatchMint = {
                    ids: [nfCollection1], // can't mint a non-fungible collection
                    supplies: [new BN(1)]
                }

                if (newABI) {
                    await expectRevert.unspecified(this.token.batchMint(
                        owner,
                        wrongTokensToBatchMint.ids,
                        wrongTokensToBatchMint.supplies,
                        EmptyByte,
                        true,
                        { from: minter })
                    );
                } else {
                    await expectRevert.unspecified(this.token.batchMint(
                        owner,
                        wrongTokensToBatchMint.ids,
                        wrongTokensToBatchMint.supplies,
                        { from: minter })
                    );
                }
            });

            it('should revert if minting a non-fungible token that already has been minted', async function () {
                const wrongTokensToBatchMint = {
                    ids: [nft1, nft2, nft2], // same token id
                    supplies: [new BN(1), new BN(1), new BN(1)]
                }

                if (newABI) {
                    await expectRevert.unspecified(this.token.batchMint(
                        owner,
                        wrongTokensToBatchMint.ids,
                        wrongTokensToBatchMint.supplies,
                        EmptyByte,
                        true,
                        { from: minter })
                    );
                } else {
                    await expectRevert.unspecified(this.token.batchMint(
                        owner,
                        wrongTokensToBatchMint.ids,
                        wrongTokensToBatchMint.supplies,
                        { from: minter })
                    );
                }
            });

            context('when successful', function () {
                beforeEach(async function () {
                    this.nftBalance = await this.token.balanceOf(owner);
                    if (newABI) {
                        this.receipt = await this.token.batchMint(
                            owner,
                            tokensToBatchMint.ids,
                            tokensToBatchMint.supplies,
                            EmptyByte,
                            true,
                            { from: minter }
                        );
                    } else {
                        this.receipt = await this.token.batchMint(
                            owner,
                            tokensToBatchMint.ids,
                            tokensToBatchMint.supplies,
                            { from: minter }
                        );
                    }
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

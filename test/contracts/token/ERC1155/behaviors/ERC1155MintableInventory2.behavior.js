const { BN, expectEvent, expectRevert } = require('@openzeppelin/test-helpers');
const { ZeroAddress, EmptyByte } = require('@animoca/ethereum-contracts-core_library').constants;

const {
    makeFungibleCollectionId,
    makeNonFungibleCollectionId,
    makeNonFungibleTokenId,
    getNonFungibleBaseCollectionId
} = require('@animoca/blockchain-inventory_metadata').inventoryIds;

function shouldBehaveLikeERC1155MintableInventory2(
    nfMaskLength,
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

    describe('like an ERC1155MintableInventory', function () {
        beforeEach(async function () {
            await this.token.addMinter(minter, { from: creator });
        });

        context('_mint', function () {
            it('should revert if the sender is not a Minter', async function () {
                // TODO revert msg
                await expectRevert.unspecified(this.token.mint(owner, nft1, 1, { from: nonMinter }));
            });

            it('should revert if the owner is the zero address', async function () {
                // TODO revert msg
                await expectRevert.unspecified(this.token.mint(ZeroAddress, nft1, 1, { from: minter }));
            });

            it('should revert if the token has already been minted', async function () {
                await this.token.mint(owner, nft1, 1, { from: minter });
                // TODO revert msg
                await expectRevert.unspecified(this.token.mint(owner, nft1, 1, { from: minter }));
            });

            context('when successful', function () {
                beforeEach(async function () {
                    this.receipt = await this.token.mint(owner, nft1, 1, { from: minter });
                });

                it('should assign the token to the new owner', async function () {
                    (await this.token.ownerOf(nft1)).should.be.equal(owner);
                });

                it('should increase the non-fungible token balance of the owner', async function () {
                    // TODO move to 1155721
                    // (await this.token.balanceOf(owner)).should.be.bignumber.equal('1');
                    (await this.token.balanceOf(owner, nft1)).should.be.bignumber.equal('1');
                });

                it('should increase the non-fungible collection balance of the owner', async function () {
                    (await this.token.balanceOf(owner, nfCollection1)).should.be.bignumber.equal('1');
                });

                it('should emit the TransferSingle event', async function () {
                    expectEvent(this.receipt, 'TransferSingle', {
                        _operator: minter,
                        _from: ZeroAddress,
                        _to: owner,
                        _id: nft1,
                        _value: new BN("1"),
                    });
                });
            });
        });

        context('mintFungible', function () {
            let supply = new BN(10);

            it('should revert if the sender is not a Minter', async function () {
                await expectRevert.unspecified(this.token.mint(owner, fCollection1, supply, { from: nonMinter }));
            });

            it('should revert if the owner is the zero address', async function () {
                await expectRevert.unspecified(this.token.mint(ZeroAddress, fCollection1, supply, { from: minter }));
            });

            it('should mint if the token has already been minted', async function () {
                await this.token.mint(owner, fCollection1, supply, { from: minter });
                await this.token.mint(owner, fCollection1, supply, { from: minter });
                (await this.token.balanceOf(owner, fCollection1)).toNumber().should.be.equal(supply.toNumber() * 2);
            });

            // it('should revert if minting an unknown fungible token collection', async function () {
            //     await expectRevert.unspecified(this.token.mintFungible(owner, unknownFCollection, supply, { from: minter }));
            // });

            context('when successful', function () {
                beforeEach(async function () {
                    this.receipt = await this.token.mint(owner, fCollection1, supply, { from: minter });
                });

                it('should increase the fungible collection balance of the owner', async function () {
                    (await this.token.balanceOf(owner, fCollection1)).toNumber().should.be.equal(supply.toNumber());
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
        });

        context('batchMint', function () {
            it('should revert if the sender is not a Minter', async function () {
                await expectRevert.unspecified(this.token.batchMint(owner, tokensToBatchMint.ids, tokensToBatchMint.supplies, { from: nonMinter }));
            });

            it('should revert if the fungible quantity is less than 1', async function () {
                await expectRevert.unspecified(this.token.batchMint(owner, [fCollection1], [new BN(0)], { from: minter }));
            });

            it('it should revert if the non-fungible quantity is greater than 1', async function () {
                await expectRevert.unspecified(this.token.batchMint(owner, [nft1], [new BN(2)], { from: minter }));
            });

            it('it should revert if the non-fungible quantity is less than 1', async function () {
                await expectRevert.unspecified(this.token.batchMint(owner, [nft1], [new BN(0)], { from: minter }));
            });

            it('it should revert if there is a mismatch in the param array lengths', async function () {
                const wrongTokensToBatchMint = {
                    ids: [nft1, nft2, nft3],
                    supplies: [new BN(1), new BN(1)]
                }

                await expectRevert.unspecified(this.token.batchMint(
                    owner,
                    wrongTokensToBatchMint.ids,
                    wrongTokensToBatchMint.supplies,
                    { from: minter })
                );
            });

            it('should revert if minting a collection', async function () {
                const wrongTokensToBatchMint = {
                    ids: [nfCollection1], // can't mint a non-fungible collection
                    supplies: [new BN(1)]
                }

                await expectRevert.unspecified(this.token.batchMint(
                    owner,
                    wrongTokensToBatchMint.ids,
                    wrongTokensToBatchMint.supplies,
                    { from: minter })
                );
            });

            it('should revert if minting a non-fungible token that already has been minted', async function () {
                const wrongTokensToBatchMint = {
                    ids: [nft1, nft2, nft2], // same token id
                    supplies: [new BN(1), new BN(1), new BN(1)]
                }
                await expectRevert.unspecified(this.token.batchMint(
                    owner,
                    wrongTokensToBatchMint.ids,
                    wrongTokensToBatchMint.supplies,
                    { from: minter })
                );
            });

            context('when successful', function () {

                // const tokensToBatchMint = {
                //     ids: [nft1, nft2, fCollection1, nft3, fCollection2], // same token id
                //     supplies: ['1', '1', '10', '1', '5']
                // }

                beforeEach(async function () {
                    this.receipt = await this.token.batchMint(
                        owner,
                        tokensToBatchMint.ids,
                        tokensToBatchMint.supplies,
                        { from: minter }
                    );
                });

                it('should increase the fungible collection balances of the owner', async function () {
                    (await this.token.balanceOf(owner, fCollection1)).toNumber().should.be.equal(1);
                    (await this.token.balanceOf(owner, fCollection2)).toNumber().should.be.equal(2);
                    (await this.token.balanceOf(owner, fCollection3)).toNumber().should.be.equal(3);
                });

                it('should emit a TransferBatch event', async function () {
                    let totalIdCount = 0;
                    for (let log of this.receipt.logs) {
                        if (log.event === 'TransferBatch' &&
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

                it('should increase the non-fungible token balance of the owner', async function () {
                    // TODO move to 1155721
                    // (await this.token.balanceOf(owner)).should.be.bignumber.equal('3');
                    (await this.token.balanceOf(owner, nft1)).should.be.bignumber.equal('1');
                    (await this.token.balanceOf(owner, nft2)).should.be.bignumber.equal('1');
                    (await this.token.balanceOf(owner, nft3)).should.be.bignumber.equal('1');
                });

                it('should increase the non-fungible collection balance of the owner', async function () {
                    (await this.token.balanceOf(owner, nfCollection1)).should.be.bignumber.equal('1');
                    (await this.token.balanceOf(owner, nfCollection2)).should.be.bignumber.equal('2');
                });

                // TODO Move to 1155721
                // it('should emit the Transfer event', async function () {
                //     expectEvent(this.receipt, 'Transfer', {
                //         _from: ZeroAddress,
                //         _to: owner,
                //         _tokenId: nft1,
                //     });
                // });

                // it('should emit URI events', async function () {
                //     for (const id of tokensToBatchMint.ids) {
                //         const fungible = await this.token.isFungible(id);
                //         if (!fungible) {
                //             expectEvent(this.receipt, 'URI', {
                //                 _value: await this.token.uri(id),
                //                 _id: id
                //             });
                //         }
                //     }
                // });
            });
        });

        // TODO safe batch mint
    });
}

module.exports = {
    shouldBehaveLikeERC1155MintableInventory2,
};

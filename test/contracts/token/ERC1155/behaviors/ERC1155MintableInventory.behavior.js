const { MaxUInt256 } = require('@animoca/ethereum-contracts-core_library/src/constants');
const { contract } = require('@openzeppelin/test-environment');
const { BN, expectEvent, expectRevert } = require('@openzeppelin/test-helpers');
const { One, ZeroAddress } = require('@animoca/ethereum-contracts-core_library').constants;

const {
    makeFungibleCollectionId,
    makeNonFungibleCollectionId,
    makeNonFungibleTokenId,
    getNonFungibleBaseCollectionId
} = require('@animoca/blockchain-inventory_metadata').inventoryIds;

const ReceiverMock = contract.fromArtifact('ERC1155721ReceiverMock');

// TODO, checks for totalSupply if new ABI
function shouldBehaveLikeERC1155MintableInventory(
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

    describe('like a mintable ERC1155Inventory', function () {
        beforeEach(async function () {
            await this.token.addMinter(minter, { from: creator });
        });

        context('minting NFT', function () {
            it('should revert if the sender is not a Minter', async function () {
                await expectRevert.unspecified(mint(this.token, owner, nft1, 1, '0x', { from: nonMinter }));
            });

            it('should revert if the owner is the zero address', async function () {
                await expectRevert.unspecified(mint(this.token, ZeroAddress, nft1, 1, '0x',{ from: minter }));
            });

            it('should revert if the token has already been minted', async function () {
                await mint(this.token, owner, nft1, 1, '0x', { from: minter });
                await expectRevert.unspecified(mint(this.token, owner, nft1, 1, '0x', { from: minter }));
            });

            context('when successful', function () {
                beforeEach(async function () {
                    this.uri = await this.token.uri(nft1);
                    this.receipt = await mint(this.token, owner, nft1, 1, '0x', { from: minter });
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

            context('if the recipient is a contract', function () {
                it('should revert if the contract does not implement ERC1155TokenReceiver', async function () {
                    this.receiver = await ReceiverMock.new(false, false, {from: creator});
                    await expectRevert.unspecified(mint(this.token, this.receiver.address, nft1, 1, '0x', { from: minter }));
                });

                it('should emit the ReceivedSingle event', async function () {
                    this.receiver = await ReceiverMock.new(false, true, {from: creator});
                    this.receipt = await mint(this.token, this.receiver.address, nft1, 1, '0x', { from: minter });
                    await expectEvent.inTransaction(this.receipt.tx, this.receiver, 'ReceivedSingle', {
                        operator: minter,
                        from: ZeroAddress,
                        id: nft1,
                        value: 1,
                        data: null
                    });
                });
            });
        });

        context('minting fungible', function () {
            let supply = new BN(10);

            it('should revert if the sender is not a Minter', async function () {
                await expectRevert.unspecified(mint(this.token, owner, fCollection1, supply, '0x', { from: nonMinter }));
            });

            it('should revert if the owner is the zero address', async function () {
                await expectRevert.unspecified(mint(this.token, ZeroAddress, fCollection1, supply, '0x', { from: minter }));
            });

            it('should revert if minting an overflowing supply', async function () {
                await mint(this.token, owner, fCollection1, MaxUInt256, '0x', { from: minter });
                await expectRevert.unspecified(mint(this.token, ZeroAddress, fCollection1, 1, '0x', { from: minter }));
            });

            it('should mint if the token has already been minted', async function () {
                await mint(this.token, owner, fCollection1, supply, '0x', { from: minter });
                await mint(this.token, owner, fCollection1, supply, '0x', { from: minter });
                (await this.token.balanceOf(owner, fCollection1)).toNumber().should.be.equal(supply.toNumber() * 2);
            });

            context('when successful', function () {
                beforeEach(async function () {
                    this.receipt = await mint(this.token, owner, fCollection1, supply, '0x', { from: minter });
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

            context('if the recipient is a contract', function () {
                it('should revert if the contract does not implement ERC1155TokenReceiver', async function () {
                    this.receiver = await ReceiverMock.new(false, false, {from: creator});
                    await expectRevert.unspecified(mint(this.token, this.receiver.address, fCollection1, supply, '0x', { from: minter }));
                });

                it('should emit the ReceivedSingle event', async function () {
                    this.receiver = await ReceiverMock.new(false, true, {from: creator});
                    this.receipt = await mint(this.token, this.receiver.address, fCollection1, supply, '0x', { from: minter });
                    await expectEvent.inTransaction(this.receipt.tx, this.receiver, 'ReceivedSingle', {
                        operator: minter,
                        from: ZeroAddress,
                        id: fCollection1,
                        value: supply,
                        data: null
                    });
                });
            });
        });

        context('batch minting', function () {
            it('should revert if the sender is not a Minter', async function () {
                await expectRevert.unspecified(batchMint(this.token, owner, tokensToBatchMint.ids, tokensToBatchMint.supplies, '0x', { from: nonMinter }));
            });

            it('should revert if the fungible quantity is less than 1', async function () {
                await expectRevert.unspecified(batchMint(this.token, owner, [fCollection1], [new BN(0)], '0x', { from: minter }));
            });

            it('it should revert if the non-fungible quantity is greater than 1', async function () {
                await expectRevert.unspecified(batchMint(this.token, owner, [nft1], [new BN(2)], '0x', { from: minter }));
            });

            it('it should revert if the non-fungible quantity is less than 1', async function () {
                await expectRevert.unspecified(batchMint(this.token, owner, [nft1], [new BN(0)], '0x', { from: minter }));
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
                    this.receipt = await batchMint(
                        this.token,
                        owner,
                        tokensToBatchMint.ids,
                        tokensToBatchMint.supplies,
                        '0x',
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

                it('should increase the non-fungible token balances of the owner', async function () {
                    (await this.token.balanceOf(owner, nft1)).should.be.bignumber.equal('1');
                    (await this.token.balanceOf(owner, nft2)).should.be.bignumber.equal('1');
                    (await this.token.balanceOf(owner, nft3)).should.be.bignumber.equal('1');
                });

                it('should increase the non-fungible collection balance of the owner', async function () {
                    (await this.token.balanceOf(owner, nfCollection1)).should.be.bignumber.equal('1');
                    (await this.token.balanceOf(owner, nfCollection2)).should.be.bignumber.equal('2');
                });
            });

            context('if the recipient is a contract', function () {
                it('should revert if the contract does not implement ERC1155TokenReceiver', async function () {
                    this.receiver = await ReceiverMock.new(false, false, {from: creator});
                    await expectRevert.unspecified(batchMint(
                        this.token,
                        this.receiver.address,
                        tokensToBatchMint.ids,
                        tokensToBatchMint.supplies,
                        '0x',
                        { from: minter }
                    ));
                });

                it('should emit the ReceivedBatch event', async function () {
                    this.receiver = await ReceiverMock.new(false, true, {from: creator});
                    this.receipt = await batchMint(
                        this.token,
                        this.receiver.address,
                        tokensToBatchMint.ids,
                        tokensToBatchMint.supplies,
                        '0x',
                        { from: minter }
                    );
                    await expectEvent.inTransaction(this.receipt.tx, this.receiver, 'ReceivedBatch', {
                        operator: minter,
                        from: ZeroAddress,
                        ids: tokensToBatchMint.ids,
                        values: tokensToBatchMint.supplies,
                        data: null
                    });
                });
            });
        });
    });
}

module.exports = {
    shouldBehaveLikeERC1155MintableInventory,
};

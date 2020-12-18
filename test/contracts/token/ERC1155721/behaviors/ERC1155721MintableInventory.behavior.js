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
    {nfMaskLength, revertMessages, safeMint, safeBatchMint, mint_ERC721, safeMint_ERC721, batchMint_ERC721},
    [creator, minter, nonMinter, owner]
) {
    const fCollection1 = makeFungibleCollectionId(1);
    const fCollection2 = makeFungibleCollectionId(2);
    const fCollection3 = makeFungibleCollectionId(3);
    const nfCollection1 = makeNonFungibleCollectionId(1, nfMaskLength);
    const nfCollection2 = makeNonFungibleCollectionId(2, nfMaskLength);
    const nft1 = makeNonFungibleTokenId(1, getNonFungibleBaseCollectionId(nfCollection1, nfMaskLength), nfMaskLength);
    const nft2 = makeNonFungibleTokenId(1, getNonFungibleBaseCollectionId(nfCollection2, nfMaskLength), nfMaskLength);
    const nft3 = makeNonFungibleTokenId(2, getNonFungibleBaseCollectionId(nfCollection2, nfMaskLength), nfMaskLength);

    describe('like a mintable ERC1155721Inventory', function () {
        beforeEach(async function () {
            await this.token.addMinter(minter, { from: creator });
        });

        context('ERC-1155 minting', function () {

            context('_safeMint()', function () {
                it('it should revert if the caller is not a minter', async function () {
                    await expectRevert(
                        safeMint(this.token, owner, nft1, 1, '0x', { from: nonMinter }),
                        revertMessages.NotMinter
                    );
                });

                context('when successful', function () {
                    beforeEach(async function () {
                        this.nftBalance = await this.token.balanceOf(owner);
                        this.supply = await this.token.totalSupply(nfCollection1);
                        this.nftSupply = await this.token.totalSupply(nft1);
                        this.receipt = await safeMint(this.token, owner, nft1, 1, '0x', { from: minter });
                    });
        
                    it('should increase the non-fungible token balance of the owner', async function () {
                        (await this.token.balanceOf(owner)).should.be.bignumber.equal(this.nftBalance.add(One));
                    });
        
                    it('should increase the non-fungible token supply', async function () {
                        (await this.token.totalSupply(nft1)).should.be.bignumber.equal(this.nftSupply.addn(1));
                    });
        
                    it('should increase the non-fungible collection supply', async function () {
                        (await this.token.totalSupply(nfCollection1)).should.be.bignumber.equal(this.supply.addn(1));
                    });
        
                    it('should emit the Transfer event', async function () {
                        expectEvent(
                            this.receipt,
                            'Transfer',
                            {
                                _from: ZeroAddress,
                                _to: owner,
                                _tokenId: nft1,
                            }
                        );
                    });
                });
            });
    
            context('_safeBatchMint()', function () {
                beforeEach(async function () {
                    this.tokensToBatchMint = {
                        ids: [nft1, nft2, nft3, fCollection1, fCollection2, fCollection3],
                        supplies: [new BN(1), new BN(1), new BN(1), new BN(1), new BN(2), new BN(3)]
                    }
                });
            
                it('it should revert if the caller is not a minter', async function () {
                    await expectRevert(
                        safeBatchMint(this.token, owner, [fCollection1], [new BN(0)], '0x', { from: nonMinter }),
                        revertMessages.NotMinter
                    );
                });

                it('should revert if the fungible quantity is less than 1', async function () {
                    await expectRevert(
                        safeBatchMint(this.token, owner, [fCollection1], [new BN(0)], '0x', { from: minter }),
                        revertMessages.ZeroValue
                    );
                });
    
                it('it should revert if the non-fungible quantity is greater than 1', async function () {
                    await expectRevert(
                        safeBatchMint(this.token, owner, [nft1], [Two], '0x', { from: minter }),
                        revertMessages.WrongNFTValue
                    );
                });
    
                it('it should revert if the non-fungible quantity is less than 1', async function () {
                    await expectRevert(
                        safeBatchMint(this.token, owner, [nft1], [Zero], '0x', { from: minter }),
                        revertMessages.WrongNFTValue
                    );
                });
    
                it('it should revert if there is a mismatch in the param array lengths', async function () {
                    await expectRevert(
                        safeBatchMint(this.token, owner, [nft1, nft2, nft3], [new BN(1), new BN(1)], '0x', { from: minter }),
                        revertMessages.InconsistentArrays
                    );
                });
    
                it('should revert if minting a collection', async function () {
                    await expectRevert(
                        safeBatchMint(this.token, owner, [nfCollection1], [new BN(1)], '0x', { from: minter }),
                        revertMessages.NotTokenId
                    );
                });
    
                it('should revert if minting a non-fungible token that already has been minted', async function () {
                    await expectRevert(
                        safeBatchMint(this.token, owner, [nft1, nft2, nft2], [new BN(1), new BN(1), new BN(1)], '0x', { from: minter }),
                        revertMessages.ExistingOrBurntNFT
                    );
                });
    
                context('when successful', function () {
                    beforeEach(async function () {
                        this.nftBalance = await this.token.balanceOf(owner);
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
                        this.receipt = await safeBatchMint(this.token, owner, this.tokensToBatchMint.ids, this.tokensToBatchMint.supplies, '0x', { from: minter });
                    });
    
                    it('should increase the non-fungible token balance of the owner', async function () {
                        (await this.token.balanceOf(owner)).should.be.bignumber.equal(this.nftBalance.add(Three));
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
    
                    it('should emit Transfer events', async function () {
                        expectEvent(
                            this.receipt,
                            'Transfer',
                            {
                                _from: ZeroAddress,
                                _to: owner,
                                _tokenId: nft1,
                            }
                        );

                        expectEvent(
                            this.receipt,
                            'Transfer',
                            {
                                _from: ZeroAddress,
                                _to: owner,
                                _tokenId: nft2,
                            }
                        );

                        expectEvent(
                            this.receipt,
                            'Transfer',
                            {
                                _from: ZeroAddress,
                                _to: owner,
                                _tokenId: nft3,
                            }
                        );
                    });
                });
            });

        });

        context('ERC-721 minting', function () {

            context('_mint_ERC721()', function () {

                context('safe minting', function () {
                    it('it should revert if the caller is not a minter', async function () {
                        await expectRevert(
                            safeMint_ERC721(this.token, owner, nft1, '0x', { from: nonMinter }),
                            revertMessages.NotMinter
                        );
                    });
    
                    context('when successful', function () {
                        beforeEach(async function () {
                            this.nftBalance = await this.token.balanceOf(owner);
                            this.supply = await this.token.totalSupply(nfCollection1);
                            this.nftSupply = await this.token.totalSupply(nft1);
                            this.receipt = await safeMint_ERC721(this.token, owner, nft1, '0x', { from: minter });
                        });
            
                        it('should increase the non-fungible token balance of the owner', async function () {
                            (await this.token.balanceOf(owner)).should.be.bignumber.equal(this.nftBalance.add(One));
                        });
            
                        it('should increase the non-fungible token supply', async function () {
                            (await this.token.totalSupply(nft1)).should.be.bignumber.equal(this.nftSupply.addn(1));
                        });
            
                        it('should increase the non-fungible collection supply', async function () {
                            (await this.token.totalSupply(nfCollection1)).should.be.bignumber.equal(this.supply.addn(1));
                        });
            
                        it('should emit the Transfer event', async function () {
                            expectEvent(
                                this.receipt,
                                'Transfer',
                                {
                                    _from: ZeroAddress,
                                    _to: owner,
                                    _tokenId: nft1,
                                }
                            );
                        });
                    });
                });

                context('non-safe minting', function () {
                    it('it should revert if the caller is not a minter', async function () {
                        await expectRevert(
                            mint_ERC721(this.token, owner, nft1, { from: nonMinter }),
                            revertMessages.NotMinter
                        );
                    });
    
                    context('when successful', function () {
                        beforeEach(async function () {
                            this.nftBalance = await this.token.balanceOf(owner);
                            this.supply = await this.token.totalSupply(nfCollection1);
                            this.nftSupply = await this.token.totalSupply(nft1);
                            this.receipt = await mint_ERC721(this.token, owner, nft1, { from: minter });
                        });
            
                        it('should increase the non-fungible token balance of the owner', async function () {
                            (await this.token.balanceOf(owner)).should.be.bignumber.equal(this.nftBalance.add(One));
                        });
            
                        it('should increase the non-fungible token supply', async function () {
                            (await this.token.totalSupply(nft1)).should.be.bignumber.equal(this.nftSupply.addn(1));
                        });
            
                        it('should increase the non-fungible collection supply', async function () {
                            (await this.token.totalSupply(nfCollection1)).should.be.bignumber.equal(this.supply.addn(1));
                        });
            
                        it('should emit the Transfer event', async function () {
                            expectEvent(
                                this.receipt,
                                'Transfer',
                                {
                                    _from: ZeroAddress,
                                    _to: owner,
                                    _tokenId: nft1,
                                }
                            );
                        });
                    });
                });

            });

            context('_batchMint_ERC721()', function () {
                it('it should revert if the caller is not a minter', async function () {
                    await expectRevert(
                        batchMint_ERC721(this.token, owner, [nft1], { from: nonMinter }),
                        revertMessages.NotMinter
                    );
                });

                it('it should revert if `to` is the zero address', async function () {
                    await expectRevert(
                        batchMint_ERC721(this.token, ZeroAddress, [nft1], { from: minter }),
                        revertMessages.TransferToZero
                    );
                });
    
                it('it should revert if the if any of the `nftIds` is a fungible collection', async function () {
                    await expectRevert(
                        batchMint_ERC721(this.token, owner, [fCollection1], { from: minter }),
                        revertMessages.NotNFT
                    );
                });
    
                it('it should revert if the if any of the `nftIds` is a non-fungible collection', async function () {
                    await expectRevert(
                        batchMint_ERC721(this.token, owner, [nfCollection1], { from: minter }),
                        revertMessages.NotNFT
                    );
                });
    
                it('should revert if minting a non-fungible token that already has been minted', async function () {
                    await expectRevert(
                        batchMint_ERC721(this.token, owner, [nft2, nft2], { from: minter }),
                        revertMessages.ExistingOrBurntNFT
                    );
                });
    
                context('when successful', function () {
                    beforeEach(async function () {
                        this.tokensToBatchMint = [nft1, nft2, nft3];
                        this.nftBalance = await this.token.balanceOf(owner);
                        this.supplies = {
                            nfCollection1: await this.token.totalSupply(nfCollection1),
                            nfCollection2: await this.token.totalSupply(nfCollection2),
                            nft1: await this.token.totalSupply(nft1),
                            nft2: await this.token.totalSupply(nft2),
                            nft3: await this.token.totalSupply(nft3),
                        };
                        this.receipt = await batchMint_ERC721(this.token, owner, this.tokensToBatchMint, { from: minter });
                    });
    
                    it('should increase the non-fungible token balance of the owner', async function () {
                        (await this.token.balanceOf(owner)).should.be.bignumber.equal(this.nftBalance.add(Three));
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
    
                    it('should emit Transfer events', async function () {
                        this.tokensToBatchMint.forEach((tokenId) => {
                            expectEvent(
                                this.receipt,
                                'Transfer',
                                {
                                    _from: ZeroAddress,
                                    _to: owner,
                                    _tokenId: tokenId,
                                }
                            );
                        });
                    });
    
                    it('should emit the TransferBatch event', async function () {
                        expectEvent(
                            this.receipt,
                            'TransferBatch',
                            {
                                _operator: minter,
                                _from: ZeroAddress,
                                _to: owner,
                                _ids: this.tokensToBatchMint,
                                _values: Array(this.tokensToBatchMint.length).fill(1),
                            }
                        );
                    });
                });
            });

        });
    });
}

module.exports = {
    shouldBehaveLikeERC1155721MintableInventory,
};

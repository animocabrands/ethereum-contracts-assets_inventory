const { expectRevert } = require('@openzeppelin/test-helpers');
const { makeNonFungibleTokenId } = require('@animoca/blockchain-inventory_metadata').inventoryIds;

const { behaviors } = require('@animoca/ethereum-contracts-core_library');
const interfaces = require('../../../../../src/interfaces/ERC165/ERC721');
const { EmptyByte } = require('@animoca/ethereum-contracts-core_library/src/constants');

function shouldBehaveLikeERC721Metadata(
    nfMaskLength,
    name,
    symbol,
    newABI,
    creator,
    [owner]
) {

    const nft1 = makeNonFungibleTokenId(1, 1, nfMaskLength);
    const nft2 = makeNonFungibleTokenId(2, 1, nfMaskLength);

    describe('like an ERC721Metadata', function () {
        it('has a name', async function () {
            (await this.token.name()).should.be.equal(name);
        });

        it('has a symbol', async function () {
            (await this.token.symbol()).should.be.equal(symbol);
        });

        describe('tokenURI', function () {
            beforeEach(async function () {
                if (newABI) {
                    await this.token.mint(owner, nft1, 1, EmptyByte, true, { from: creator });
                } else {
                    await this.token.mintNonFungible(owner, nft1, { from: creator });
                }
            });
    
            it('tokenURI()', async function () {
                (await this.token.tokenURI(nft1)).should.not.be.equal('');
                await expectRevert.unspecified(this.token.tokenURI(nft2));
            });
        });
    
        describe('ERC165 interfaces support', function () {
            behaviors.shouldSupportInterfaces([
                interfaces.ERC721Metadata,
            ]);
        });
    });
}

module.exports = {
    shouldBehaveLikeERC721Metadata,
};

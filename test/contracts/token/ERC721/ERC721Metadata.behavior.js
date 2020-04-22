const { expectRevert } = require('@openzeppelin/test-helpers');
const { makeNonFungibleTokenId } = require('@animoca/blockchain-inventory_metadata').inventoryIds;

const { shouldSupportInterfaces } = require('@animoca/ethereum-contracts-core_library');
const interfaces = require('../../../../src/interfaces/ERC165/ERC721');

function shouldBehaveLikeERC721Metadata(
    nfMaskLength,
    name,
    symbol,
    creator,
    [owner]
) {

    const nft1 = makeNonFungibleTokenId(1, 1, nfMaskLength);
    const nft2 = makeNonFungibleTokenId(2, 1, nfMaskLength);

    describe('like a Metadata token', function () {
        it('has a name', async function () {
            (await this.token.name()).should.be.equal(name);
        });

        it('has a symbol', async function () {
            (await this.token.symbol()).should.be.equal(symbol);
        });
    });

    describe('metadata URI', function () {
        beforeEach(async function () {
            await this.token.mintNonFungible(owner, nft1, { from: creator });
        });

        it('tokenURI()', async function () {
            (await this.token.tokenURI(nft1)).should.not.be.equal('');
            await expectRevert.unspecified(this.token.tokenURI(nft2));
        });
    });

    shouldSupportInterfaces([
        interfaces.ERC721Metadata,
    ]);
}

module.exports = {
    shouldBehaveLikeERC721Metadata,
};

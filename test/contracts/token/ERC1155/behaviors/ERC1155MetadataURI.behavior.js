const { makeFungibleCollectionId, makeNonFungibleCollectionId, makeNonFungibleTokenId } = require('@animoca/blockchain-inventory_metadata').inventoryIds;
const { shouldSupportInterfaces } = require('@animoca/ethereum-contracts-core_library');
const interfaces = require('../../../../../src/interfaces/ERC165/ERC1155');

function shouldBehaveLikeERC1155MetadataURI(
    nfMaskLength
) {

    const fCollection = makeFungibleCollectionId(1);
    const nfCollection = makeNonFungibleCollectionId(1, nfMaskLength);
    const nft = makeNonFungibleTokenId(1, 1, nfMaskLength);

    describe('metadata URI', () => {

        it('uri()', async function () {
            (await this.token.uri(fCollection)).should.not.be.equal('');
            (await this.token.uri(nfCollection)).should.not.be.equal('');
            (await this.token.uri(nft)).should.not.be.equal('');
        });
    });

    shouldSupportInterfaces([
        interfaces.ERC1155MetadataURI,
      ]);
}

module.exports = {
    shouldBehaveLikeERC1155MetadataURI,
};

const {accounts, web3} = require('hardhat');
const {createFixtureLoader} = require('@animoca/ethereum-contracts-core_library/test/utils/fixture');
const {
  makeFungibleCollectionId,
  makeNonFungibleCollectionId,
  makeNonFungibleTokenId,
} = require('@animoca/blockchain-inventory_metadata').inventoryIds;
const {behaviors} = require('@animoca/ethereum-contracts-core_library');
const interfaces = require('../../../../../src/interfaces/ERC165/ERC1155');

function shouldBehaveLikeERC1155MetadataURI({nfMaskLength, deploy}) {
  const [creator] = accounts;

  const fCollection = makeFungibleCollectionId(1);
  const nfCollection = makeNonFungibleCollectionId(1, nfMaskLength);
  const nft = makeNonFungibleTokenId(1, 1, nfMaskLength);

  // todo make a real test
  describe('like an ERC1155MetadataURI', function () {
    const fixtureLoader = createFixtureLoader(accounts, web3.eth.currentProvider);
    const fixture = async function () {
      this.token = await deploy(creator);
    };

    beforeEach(async function () {
      await fixtureLoader(fixture, this);
    });

    it('uri()', async function () {
      (await this.token.uri(fCollection)).should.not.be.equal('');
      (await this.token.uri(nfCollection)).should.not.be.equal('');
      (await this.token.uri(nft)).should.not.be.equal('');
    });

    describe('ERC165 interfaces support', function () {
      behaviors.shouldSupportInterfaces([interfaces.ERC1155MetadataURI]);
    });
  });
}

module.exports = {
  shouldBehaveLikeERC1155MetadataURI,
};

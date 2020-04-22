const { makeFungibleCollectionId, makeNonFungibleCollectionId } = require('@animoca/blockchain-inventory_metadata').inventoryIds;

const { shouldSupportInterfaces, interfaces } = require('@animoca/ethereum-contracts-core_library');
const { shouldBehaveLikeERC721 } = require('../ERC721/ERC721.behavior');
const { shouldBehaveLikeERC721Metadata } = require('../ERC721/ERC721Metadata.behavior');
const { shouldBehaveLikeERC1155MetadataURI } = require('../ERC1155/ERC1155MetadataURI.behavior');
const { shouldBehaveLikeERC1155AssetCollections } = require('../ERC1155/ERC1155AssetCollections.behavior');
const { shouldBehaveLikeERC1155721 } = require('./ERC1155721.behavior');

function shouldBehaveLikeAssetsInventory(
  nfMaskLength,
  creator,
  otherAccounts,
  name,
  symbol
) {

  beforeEach(async function () {
    await this.token.createCollection(makeFungibleCollectionId(1, nfMaskLength), { from: creator });
    await this.token.createCollection(makeFungibleCollectionId(2, nfMaskLength), { from: creator });
    await this.token.createCollection(makeFungibleCollectionId(3, nfMaskLength), { from: creator });
    await this.token.createCollection(makeNonFungibleCollectionId(1, nfMaskLength), { from: creator });
    await this.token.createCollection(makeNonFungibleCollectionId(2, nfMaskLength), { from: creator });
    await this.token.createCollection(makeNonFungibleCollectionId(3, nfMaskLength), { from: creator });

    this.contract = this.token;
  });

  shouldSupportInterfaces([
    interfaces.ERC165,
  ]);

  shouldBehaveLikeERC721(nfMaskLength, creator, otherAccounts);
  shouldBehaveLikeERC721Metadata(nfMaskLength, name, symbol, creator, otherAccounts);
  shouldBehaveLikeERC1155AssetCollections(nfMaskLength, creator, otherAccounts);
  shouldBehaveLikeERC1155MetadataURI(nfMaskLength, creator, otherAccounts);
  shouldBehaveLikeERC1155721(nfMaskLength, creator, otherAccounts);
}

module.exports = {
  shouldBehaveLikeAssetsInventory,
};
const { contract, accounts } = require('@openzeppelin/test-environment');

const { shouldBehaveLikeERC721 } = require('../ERC721/behaviors/ERC721.behavior');
const { shouldBehaveLikeERC721Metadata } = require('../ERC721/behaviors/ERC721Metadata.behavior');
const { shouldBehaveLikeERC1155MetadataURI } = require('../ERC1155/behaviors/ERC1155MetadataURI.behavior');
const { shouldBehaveLikeERC1155Inventory } = require('../ERC1155/behaviors/ERC1155Inventory.behavior');
const { shouldBehaveLikeERC1155MintableInventory } = require('../ERC1155/behaviors/ERC1155MintableInventory.behavior');
const { shouldBehaveLikeERC1155BurnableInventory } = require('../ERC1155/behaviors/ERC1155BurnableInventory.behavior');
const { shouldBehaveLikeAssetsInventory } = require('./behaviors/AssetsInventory.behavior');

const ERC1155721Inventory = contract.fromArtifact('ERC1155721InventoryMock');

describe.only('ERC1155721Inventory', function () {
  const [creator, ...otherAccounts] = accounts;
  const nfMaskLength = 32;

  beforeEach(async function () {
    this.token = await ERC1155721Inventory.new({ from: creator });
  });

  shouldBehaveLikeERC721(nfMaskLength, true, creator, otherAccounts);
  shouldBehaveLikeERC721Metadata(nfMaskLength, "ERC1155721InventoryMock", "INV", true, creator, otherAccounts);

  shouldBehaveLikeERC1155Inventory(nfMaskLength, creator, otherAccounts);
  shouldBehaveLikeERC1155MintableInventory(nfMaskLength, true, creator, otherAccounts);

  shouldBehaveLikeERC1155BurnableInventory(nfMaskLength, true, accounts, [
      'Inventory: non-owned NFT',
      'Inventory: non-approved sender',
      'Inventory: non-existing NFT'
    ]);
  shouldBehaveLikeERC1155MetadataURI(nfMaskLength);
  shouldBehaveLikeAssetsInventory(nfMaskLength, true, creator, otherAccounts);
});


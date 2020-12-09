const { contract, accounts } = require('@openzeppelin/test-environment');

const { shouldBehaveLikeERC1155Inventory } = require('./behaviors/ERC1155Inventory.behavior');
const { shouldBehaveLikeERC1155MintableInventory2 } = require('./behaviors/ERC1155MintableInventory2.behavior');
const { shouldBehaveLikeERC1155BurnableInventory2 } = require('./behaviors/ERC1155BurnableInventory2.behavior');
const { shouldBehaveLikeERC1155MetadataURI } = require('./behaviors/ERC1155MetadataURI.behavior');

const ERC1155Inventory = contract.fromArtifact('ERC1155InventoryMock');

describe('ERC1155Inventory', function () {
  const [creator, ...otherAccounts] = accounts;
  const nfMaskLength = 32;

  beforeEach(async function () {
    this.token = await ERC1155Inventory.new({ from: creator });
  });

  shouldBehaveLikeERC1155Inventory(nfMaskLength, creator, otherAccounts);
  shouldBehaveLikeERC1155MintableInventory2(nfMaskLength, creator, otherAccounts);

  shouldBehaveLikeERC1155BurnableInventory2(nfMaskLength, accounts, [
      'Inventory: non-owned NFT',
      'Inventory: non-approved sender',
      'Inventory: non-existing NFT'
    ]);
  shouldBehaveLikeERC1155MetadataURI(nfMaskLength);
});


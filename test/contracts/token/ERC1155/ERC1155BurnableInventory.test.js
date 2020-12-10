const { contract, accounts } = require('@openzeppelin/test-environment');

const { shouldBehaveLikeERC1155AssetsInventory } = require('./behaviors/ERC1155AssetsInventory.behavior');
const { shouldBehaveLikeERC1155BurnableInventory } = require('./behaviors/ERC1155BurnableInventory.behavior');
const { shouldBehaveLikeERC1155MintableInventory } = require('./behaviors/ERC1155MintableInventory.behavior');
const { shouldBehaveLikeERC1155MetadataURI } = require('./behaviors/ERC1155MetadataURI.behavior');

const ERC1155BurnableInventory = contract.fromArtifact('ERC1155BurnableInventoryMock');

describe('ERC1155BurnableInventory', function () {
  const [creator, ...otherAccounts] = accounts;
  const nfMaskLength = 32;

  beforeEach(async function () {
    this.token = await ERC1155BurnableInventory.new(nfMaskLength, { from: creator });
  });

  shouldBehaveLikeERC1155AssetsInventory(nfMaskLength, creator, otherAccounts);
  shouldBehaveLikeERC1155MintableInventory(nfMaskLength, false, creator, otherAccounts);
  shouldBehaveLikeERC1155BurnableInventory(nfMaskLength, false, accounts, [
    'ERC1155: transfer of a non-owned NFT',
    'ERC1155: transfer by a non-approved sender',
    'ERC1155: owner of non-existing NFT'
  ]);
  shouldBehaveLikeERC1155MetadataURI(nfMaskLength);
});

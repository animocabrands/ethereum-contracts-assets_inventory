const { contract, accounts } = require('@openzeppelin/test-environment');
const { behaviors, interfaces } = require('@animoca/ethereum-contracts-core_library');
const interfaces1155 = require('../../../../src/interfaces/ERC165/ERC1155');

const { shouldBehaveLikeERC1155 } = require('./behaviors/ERC1155.behavior');
const { shouldBehaveLikeERC1155Inventory } = require('./behaviors/ERC1155Inventory.behavior');
const { shouldBehaveLikeERC1155MintableInventory } = require('./behaviors/ERC1155MintableInventory.behavior');
const { shouldBehaveLikeERC1155BurnableInventory } = require('./behaviors/ERC1155BurnableInventory.behavior');
const { shouldBehaveLikeERC1155MetadataURI } = require('./behaviors/ERC1155MetadataURI.behavior');

const ERC1155Inventory = contract.fromArtifact('ERC1155InventoryMock');
const newABI = true;

describe('ERC1155Inventory', function () {
  const [creator, ...otherAccounts] = accounts;
  const nfMaskLength = 32;

  beforeEach(async function () {
    this.token = await ERC1155Inventory.new({ from: creator });
  });

  shouldBehaveLikeERC1155(newABI, creator, otherAccounts, {
    NonApproved: 'Inventory: non-approved sender',
    NonApproved_Batch: 'Inventory: non-approved sender',
    SelfApproval: 'Inventory: self-approval',
    ZeroAddress: 'Inventory: zero address',
    TransferToZero: 'Inventory: transfer to zero',
    InconsistentArrays: 'Inventory: inconsistent arrays',
    InsufficientBalance: 'Inventory: not enough balance',
    TransferRejected: 'Inventory: transfer refused',
  });
  shouldBehaveLikeERC1155Inventory(nfMaskLength, newABI, creator, otherAccounts);
  shouldBehaveLikeERC1155MintableInventory(nfMaskLength, newABI, creator, otherAccounts);

  shouldBehaveLikeERC1155BurnableInventory(nfMaskLength, newABI, creator, otherAccounts, [
      'Inventory: non-owned NFT',
      'Inventory: non-approved sender',
      'Inventory: non-existing NFT',
      'Inventory: not enough balance',
    ]);
  shouldBehaveLikeERC1155MetadataURI(nfMaskLength);

  describe('ERC165 interfaces support', function () {
    behaviors.shouldSupportInterfaces([
      interfaces1155.ERC1155Inventory_Experimental
    ]);
  });
});


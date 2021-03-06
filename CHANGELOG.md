# Changelog

## 7.1.0

### Improvements
 * Gas optimizations in loop iterations of the `CoreMetadata`, `InventoryMetadata`, `ERC1155Inventory`, and `ERC1155InventoryBurnable` contracts.
 * Refactored `ERC1155721Inventory::approve(address,uint256)` to use `_isOperatable()` instead of an explicit implementation.
 * More comprehensive behavior tests for ERC721 `setApprovalForAll()`.
 * Updated to `@animoca/ethereum-contracts-core_library@4.0.3`.

### New features
 * Added behavior tests for ERC721 `getApproved()` and `isApprovedForAll()`.

### Bugfixes
 * Minor correction in the ERC721 mintable behavior precondition test for handling the minting of an ERC1155 fungible token. 

## 7.0.2

### Bugfixes
 * Do not use a symlink for `.setup.js`.

## 7.0.1

### Bugfixes
 * Update to `@animoca/blockchain-inventory_metadata@0.1.0`.

## 7.0.0

### Breaking changes
 * Major contracts and tests code overhaul.
 * Migration to `ethereum-contracts-core_library@4` and `hardhat`.

## 6.0.0

### Breaking changes
 * Removed `ERC721`, `ERC1155AssetsInventory`, `AssetsInventory`, and their derived contracts.

### New features
 * Added an ERC721-compliant, NFTs only `_batchMint` function for `ERC1155721Inventory`.

## 5.0.0

### Breaking changes
 * Updated to `@animoca/ethereum-contracts-core_library@3.1.1`.

### New features
 * Added `ERC721`, a standalone ERC721 implementation.
 * Added `IERC1155Inventory`, interface which adds `totalSupply(uint256)` to `IERC1155AssetCollections`.
 * Added `ERC1155Inventory` and `ERC1155InventoryMock` (implementation optimised compared to `ERC1155AssetsInventory`).

## 4.0.0

### Bugfixes
 * `AssetsInventory.sol`: Fixed the incorrect input parameter order of `_mintNonFungible()` and of those parameters passed to `super()`.

## 3.0.0

### Breaking changes
 * Updated compiler to `solc:0.6.8` and fixed solidity version in contract filed.
 * Updated `@animoca/ethereum-contracts-core_library` to version 3 and downgraded it to be a dev dependency.
 * Updated `@animoca/ethereum-contracts-erc20_base` to version 3 and downgraded it to be a dev dependency.
 * Added non-ERC721 versions of the inventory contracts.
 * Major refactor of contracts and tests, increased tests coverage.

### New features
 * Metadata management contracts.
 * Added `IERC721Exists` interface.
 * Added abstract receiver contracts.

### Improvements
 * Refactored migrations.

## 2.0.1

### Bugfixes
 * Changed `_uri(uint256)` from `pure` to `view`.

### Improvements
 * Added `constant` attribute to mocks' constant state variables.
 * Updated dependency on `@animoca/ethereum-contracts-core_library` to `1.1.0`.

## 2.0.0 (03/05/2020)

### Breaking changes
 * Migration to `@animoca/ethereum-contracts-core_library:1.0.0` with `solc:0.6.x` and `@openzeppelin/contracts:3.x`.
 * `AssetsInventory` derived contracts must now implement internal function `_uri(uint256 id)`.

### New features
 * Added `Meta20InventoryMock.sol` and related migration.
 * Added internal functions `_mintFungible` and `_mintNonFungible` to `AssetsInventory`.

## 1.1.2

### Features
 * Inventory mocks now have `MinterRole` and minting functions are `onlyMinter` instead of `onlyOwner`.

## 1.1.1

### Breaking changes
 * Moved `inventoryIds` to `@animoca/blockchain-inventory_metadata`.
 * inventoryIds is not exported any more at module level.

## 1.1.0

### Breaking changes
 * Moved `ERC20Fees` and `WhitelistedOperators` to `@animoca/ethereum-contracts-erc20_base`.
 * Removed `ERC20FeesAssetsInventoryMock`, `ERC20FeesPausableInventoryMock` and the ERC20Fees-related tests.
 * `AssetsInventory` is now burnable by default.
 * Moved `UInt2Str` to `@animoca/ethereum-contracts-core_library`.
 * `inventoryIds.js` reworked and previous functions `idInfo`, `nftId` and `makeCollectionId` are DEPRECATED.
 * Moved `inventoryIds.js` to `src/helpers/`.
 * Moved `constants.js` to `src/`.

### Features
 * Added `NonBurnableInventory`, `NonBurnablePausableInventory` and their respective Mocks.
 * New `inventoryIds` functions:
   * `isFungible(id)`
   * `Fungible.maxBaseCollectionId()`
   * `Fungible.makeCollectionId(baseCollectionId)`
   * `Fungible.getCollectionId(id)`,
   * `NonFungible.maxBaseCollectionId(nfMaskLength)`
   * `NonFungible.makeCollectionId(baseCollectionId, nfMaskLength)`
   * `NonFungible.getBaseCollectionId(id, nfMaskLength)`
   * `NonFungible.getCollectionId(id, nfMaskLength)`
   * `NonFungible.maxBaseTokenId(nfMaskLength)`
   * `NonFungible.makeTokenId(baseTokenId, baseCollectionId, nfMaskLength)`
   * `NonFungible.getBaseTokenId`
   * All these functions (except `isFungible`) return a string representation of the number value. Output base can be controlled by an optional last parameter which defaults to 10 (decimal representation).
 * Export `inventoryIds` and `constants` objects at module level.
 * Export `interfaces` object at module level: ERC165 interfaces for ERC721 and ERC1155.

### Improvement
 * Upgraded dependency on `@animoca/ethereum-contracts-core_library` from `0.0.1` to `0.0.2` and deeper integration.
 * Added unit tests for `inventoryIds`

 ## 1.0.1

### Bugfixes
* Fixed a bug where `ERC1155ReceiverMock` didn't return the correct value on batch transfers.

### Improvements
* Added dependency on `@animoca/ethereum-contracts-core_library`.

 ## 1.0.0
* Initial commit.

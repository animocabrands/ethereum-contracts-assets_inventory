// SPDX-License-Identifier: MIT

pragma solidity 0.6.8;

import "../../../token/ERC1155/ERC1155Inventory.sol";
import "../../../token/ERC1155/IERC1155InventoryMintable.sol";
import "../../../token/ERC1155/IERC1155InventoryCreator.sol";
import "../../../metadata/BaseMetadataURI.sol";
import "@animoca/ethereum-contracts-core_library/contracts/access/MinterRole.sol";

contract ERC1155InventoryMock is ERC1155Inventory, IERC1155InventoryMintable, IERC1155InventoryCreator, BaseMetadataURI, MinterRole {
    // ===================================================================================================
    //                               Admin Public Functions
    // ===================================================================================================

    /**
     * Creates a collection.
     * @dev Reverts if `collectionId` does not represent a collection.
     * @dev Reverts if `collectionId` has already been created.
     * @dev Emits a {IERC1155Inventory-CollectionCreated} event.
     * @param collectionId Identifier of the collection.
     */
    function createCollection(uint256 collectionId) external onlyOwner {
        _createCollection(collectionId);
    }

    /**
     * @dev See {IERC1155InventoryMintable-safeMint(address,uint256,uint256,bytes)}.
     */
    function safeMint(
        address to,
        uint256 id,
        uint256 value,
        bytes calldata data
    ) external override onlyMinter {
        _safeMint(to, id, value, data);
    }

    /**
     * @dev See {IERC1155721InventoryMintable-safeBatchMint(address,uint256[],uint256[],bytes)}.
     */
    function safeBatchMint(
        address to,
        uint256[] calldata ids,
        uint256[] calldata values,
        bytes calldata data
    ) external override onlyMinter {
        _safeBatchMint(to, ids, values, data);
    }

    // ===================================================================================================
    //                                 User Public Functions
    // ===================================================================================================

    /**
     * @dev See {IERC1155InventoryCreator-creator(uint256)}.
     */
    function creator(uint256 collectionId) external view override returns (address) {
        return _creator(collectionId);
    }

    // ===================================================================================================
    //                                  ERC1155 Internal Functions
    // ===================================================================================================

    function _uri(uint256 id) internal view override(ERC1155InventoryBase, BaseMetadataURI) returns (string memory) {
        return BaseMetadataURI._uri(id);
    }
}

// SPDX-License-Identifier: MIT

pragma solidity 0.6.8;

import "../../../token/ERC1155721/ERC1155721InventoryBurnable.sol";
import "../../../token/ERC1155721/IERC1155721InventoryMintable.sol";
import "../../../token/ERC1155/IERC1155InventoryCreator.sol";
import "../../../metadata/BaseMetadataURI.sol";
import "@animoca/ethereum-contracts-core_library/contracts/access/MinterRole.sol";

contract ERC1155721InventoryBurnableMock is
    ERC1155721InventoryBurnable,
    IERC1155721InventoryMintable,
    IERC1155InventoryCreator,
    BaseMetadataURI,
    MinterRole
{
    // ===================================================================================================
    //                                 ERC721Metadata
    // ===================================================================================================
    /// @dev See {IERC721Metadata-name()}.
    function name() external view virtual override returns (string memory) {
        return "ERC1155721InventoryBurnableMock";
    }

    /// @dev See {IERC721Metadata-symbol()}.
    function symbol() external view virtual override returns (string memory) {
        return "INVB";
    }

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
     * Unsafely mints a Non-Fungible Token (ERC721-compatible).
     * @dev See {IERC1155721InventoryMintable-batchMint(address,uint256)}.
     */
    function mint(address to, uint256 nftId) external override onlyMinter {
        _mint(to, nftId, "", false);
    }

    /**
     * Unsafely mints a batch of Non-Fungible Tokens (ERC721-compatible).
     * @dev See {IERC1155721InventoryMintable-batchMint(address,uint256[])}.
     */
    function batchMint(address to, uint256[] calldata nftIds) external override onlyMinter {
        _batchMint(to, nftIds);
    }

    /**
     * Safely mints a Non-Fungible Token (ERC721-compatible).
     * @dev See {IERC1155721InventoryMintable-safeMint(address,uint256,bytes)}.
     */
    function safeMint(address to, uint256 nftId, bytes calldata data) external override onlyMinter {
        _mint(to, nftId, data, true);
    }

    /**
     * Safely mints some token (ERC1155-compatible).
     * @dev See {IERC1155721InventoryMintable-safeMint(address,uint256,uint256,bytes)}.
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
     * Safely mints a batch of tokens (ERC1155-compatible).
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

    /// @dev See {IERC1155InventoryCreator-creator(uint256)}.
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

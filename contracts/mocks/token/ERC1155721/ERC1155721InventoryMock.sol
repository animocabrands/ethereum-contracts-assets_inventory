// SPDX-License-Identifier: MIT

pragma solidity 0.6.8;

import "../../../token/ERC1155721/ERC1155721Inventory.sol";
import "../../../token/ERC1155721/IERC1155721BatchTransfer.sol";
import "../../../token/ERC1155721/IERC1155721InventoryMintable.sol";
import "../../../token/ERC1155721/IERC1155721InventoryBurnable.sol";
import "../../../metadata/BaseMetadataURI.sol";
import "@animoca/ethereum-contracts-core_library/contracts/access/MinterRole.sol";

contract ERC1155721InventoryMock is ERC1155721Inventory, IERC1155721BatchTransfer, IERC1155721InventoryMintable, IERC1155721InventoryBurnable, BaseMetadataURI, MinterRole {

    string public override constant name = "ERC1155721InventoryMock";
    string public override constant symbol = "INV";

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
     * @dev See {IERC1155721InventoryMintable-mint(address,uint256)}.
     */
    function mint(
        address to,
        uint256 nftId
    ) external override onlyMinter {
        _mint_ERC721(to, nftId, "", false);
    }

    /**
     * @dev See {IERC1155721InventoryMintable-batchMint(address,uint256[])}.
     */
    function batchMint(
        address to,
        uint256[] calldata nftIds
    ) external override onlyMinter {
        _batchMint_ERC721(to, nftIds);
    }

    /**
     * @dev See {IERC1155721InventoryMintable-safeMint(address,uint256,bytes)}.
     */
    function safeMint(
        address to,
        uint256 nftId,
        bytes calldata data
    ) external override onlyMinter {
        _mint_ERC721(to, nftId, data, true);
    }

    /**
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
     * @dev See {IERC1155721BatchTransfer-batchTransferFrom(address,address,uint256[])}.
     */
    function batchTransferFrom(
        address from,
        address to,
        uint256[] calldata nftIds
    ) external override {
        _batchTransferFrom_ERC721(from, to, nftIds);
    }

    /**
     * @dev See {IERC1155721InventoryBurnable-burnFrom(address,uint256,uint256)}.
     */
    function burnFrom(
        address from,
        uint256 id,
        uint256 value
    ) external override {
        _burnFrom(from, id, value);
    }

    /**
     * @dev See {IERC1155721InventoryBurnable-batchBurnFrom(address,uint256[],uint256[])}.
     */
    function batchBurnFrom(
        address from,
        uint256[] calldata ids,
        uint256[] calldata values
    ) external override {
        _batchBurnFrom(from, ids, values);
    }

    // ===================================================================================================
    //                                  ERC1155 Internal Functions
    // ===================================================================================================

    function _uri(uint256 id) internal override(ERC1155InventoryBase, BaseMetadataURI) view returns (string memory) {
        return BaseMetadataURI._uri(id);
    }
}

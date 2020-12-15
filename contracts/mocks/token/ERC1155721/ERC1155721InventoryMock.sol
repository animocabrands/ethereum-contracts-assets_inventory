// SPDX-License-Identifier: MIT

pragma solidity 0.6.8;

import "../../../token/ERC1155721/ERC1155721Inventory.sol";
import "../../../metadata/BaseMetadataURI.sol";
import "@animoca/ethereum-contracts-core_library/contracts/access/MinterRole.sol";

contract ERC1155721InventoryMock is ERC1155721Inventory, BaseMetadataURI, MinterRole {

    string public override constant name = "ERC1155721InventoryMock";
    string public override constant symbol = "INV";

    // ===================================================================================================
    //                               Admin Public Functions
    // ===================================================================================================

    /**
     * Creates a collection.
     * @dev Reverts if `collectionId` does not represent a collection.
     * @dev Reverts if `collectionId` has already been created.
     * @dev Emits a {IERC1155-URI} event.
     * @dev Emits a {IERC1155Inventory-CollectionCreated} event.
     * @param collectionId Identifier of the collection.
     */
    function createCollection(uint256 collectionId) external onlyOwner {
        _createCollection(collectionId);
    }

    // ERC721

    /**
     * Unsafely mints an NFT using ERC721 logic.
     * @dev Reverts if `to` is the zero address.
     * @dev Reverts if `nftId` does not represent a non-fungible token.
     * @dev Reverts if `nftId` has already ben minted.
     * @dev Emits an {IERC721-Transfer} event.
     * @dev Emits an {IERC1155-TransferSingle} event.
     * @dev If `to` is a contract and supports ERC1155TokenReceiver, calls {IERC1155TokenReceiver-onERC1155Received} with empty data.
     * @param to Address of the new token owner.
     * @param nftId Identifier of the token to mint.
     */
    function mint(
        address to,
        uint256 nftId
    ) external onlyMinter {
        _mint_ERC721(to, nftId, "", false);
    }

    /**
     * Unsafely mints a batch of NFTs using ERC721 logic.
     * @dev Reverts if `to` is the zero address.
     * @dev Reverts if `id` does not represent a non-fungible token.
     * @dev Reverts if `safe` is true, the receiver is a contract and the receiver call fails or is refused.
     * @dev Emits an {IERC721-Transfer} event.
     * @dev Emits an {IERC1155-TransferSingle} event.
     * @param to Address of the new token owner.
     * @param nftIds Identifiers of the tokens to transfer.
     */
    function batchMint(
        address to,
        uint256[] calldata nftIds
    ) external onlyMinter {
        _batchMint_ERC721(to, nftIds);
    }

    /**
     * Safely mints an NFT through ERC721 logic.
     * @dev Reverts if `to` is the zero address.
     * @dev Reverts if `id` does not represent a non-fungible token.
     * @dev Reverts if `nftId` has already ben minted.
     * @dev Reverts if the call to the receiver contract (either {IERC1155TokenReceiver-onERC1155Received} or {IERC721TokenReceiver-onERC721Received}) fails or is refused.
     * @dev Emits an {IERC721-Transfer} event.
     * @dev Emits an {IERC1155-TransferSingle} event.
     * @param to Address of the new token owner.
     * @param nftId Identifier of the token to mint.
     */
    function safeMint(
        address to,
        uint256 nftId,
        bytes calldata data
    ) external onlyMinter {
        _mint_ERC721(to, nftId, data, true);
    }

    // ERC1155

    /**
     * Mints some token.
     * @dev Reverts if `to` is the zero address.
     * @dev Reverts if `id` represents a non-fungible collection.
     * @dev Reverts if `id` represents a non-fungible token and `value` is not 1.
     * @dev Reverts if `id` represents a non-fungible token which is owned by a non-zero address.
     * @dev Reverts if `id` represents a fungible collection and `value` is 0.
     * @dev Reverts if `id` represents a fungible collection and there is an overflow of supply.
     * @dev Reverts if the call to the receiver contract fails or is refused.
     * @dev Emits an {IERC721-Transfer} event.
     * @dev Emits an {IERC1155-TransferSingle} event.
     * @param to Address of the new token owner.
     * @param id Identifier of the token to mint.
     * @param value Amount of token to mint.
     * @param data If `safe` is true, optional data to send along to a receiver contract.
     */
    function safeMint(
        address to,
        uint256 id,
        uint256 value,
        bytes calldata data
    ) external onlyMinter {
        _safeMint(to, id, value, data);
    }

    /**
     * Mints a batch of tokens.
     * @dev Reverts if `ids` and `values` have different lengths.
     * @dev Reverts if `to` is the zero address.
     * @dev Reverts if one of `ids` represents a non-fungible collection.
     * @dev Reverts if one of `ids` represents a non-fungible token and its paired value is not 1.
     * @dev Reverts if one of `ids` represents a non-fungible token which has already been minted.
     * @dev Reverts if one of `ids` represents a fungible collection and its paired value is 0.
     * @dev Reverts if one of `ids` represents a fungible collection and there is an overflow of supply.
     * @dev Reverts if the call to the receiver contract fails or is refused.
     * @dev Emits up to several {IERC721-Transfer} events.
     * @dev Emits an {IERC1155-TransferBatch} event.
     * @param to Address of the new tokens owner.
     * @param ids Identifiers of the tokens to mint.
     * @param values Amounts of tokens to mint.
     * @param data Optional data to send along to a receiver contract.
     */
    function safeBatchMint(
        address to,
        uint256[] calldata ids,
        uint256[] calldata values,
        bytes calldata data
    ) external onlyMinter {
        _safeBatchMint(to, ids, values, data);
    }

    // ===================================================================================================
    //                                 User Public Functions
    // ===================================================================================================

    /**
     * Burns some token.
     * @dev Reverts if the sender is not approved.
     * @dev Reverts if `id` represents a non-fungible collection.
     * @dev Reverts if `id` represents a fungible collection and `value` is 0.
     * @dev Reverts if `id` represents a fungible collection and `value` is higher than `from`'s balance.
     * @dev Reverts if `id` represents a non-fungible token and `value` is not 1.
     * @dev Reverts if `id` represents a non-fungible token which is not owned by `from`.
     * @dev Emits an {IERC1155-TransferSingle} event.
     * @param from Address of the current token owner.
     * @param id Identifier of the token to burn.
     * @param value Amount of token to burn.
     */
    function burnFrom(
        address from,
        uint256 id,
        uint256 value
    ) external {
        _burnFrom(from, id, value);
    }

    /**
     * Burns multiple tokens.
     * @dev Reverts if `ids` and `values` have different lengths.
     * @dev Reverts if the sender is not approved.
     * @dev Reverts if one of `ids` represents a non-fungible collection.
     * @dev Reverts if one of `ids` represents a fungible collection and `value` is 0.
     * @dev Reverts if one of `ids` represents a fungible collection and `value` is higher than `from`'s balance.
     * @dev Reverts if one of `ids` represents a non-fungible token and `value` is not 1.
     * @dev Reverts if one of `ids` represents a non-fungible token which is not owned by `from`.
     * @dev Emits an {IERC1155-TransferBatch} event.
     * @param from Address of the current tokens owner.
     * @param ids Identifiers of the tokens to burn.
     * @param values Amounts of tokens to burn.
     */
    function batchBurnFrom(
        address from,
        uint256[] calldata ids,
        uint256[] calldata values
    ) external {
        _batchBurnFrom(from, ids, values);
    }

    // ===================================================================================================
    //                                  ERC1155 Internal Functions
    // ===================================================================================================

    function _uri(uint256 id) internal override(ERC1155InventoryBase, BaseMetadataURI) view returns (string memory) {
        return BaseMetadataURI._uri(id);
    }
}

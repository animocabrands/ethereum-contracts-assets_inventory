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

    /**
     * Mints some token.
     * @dev Reverts if `to` is the zero address.
     * @dev Reverts if `id` represents a non-fungible collection.
     * @dev Reverts if `id` represents a non-fungible token and `value` is not 1.
     * @dev Reverts if `id` represents a non-fungible token which is owned by a non-zero address.
     * @dev Reverts if `id` represents a fungible collection and `value` is 0.
     * @dev Reverts if `id` represents a fungible collection and there is an overflow of supply.
     * @dev Reverts if `safe` is true and the call to the receiver contract fails or is refused.
     * @dev Emits an {IERC1155-TransferSingle} event.
     * @param to Address of the new token owner.
     * @param id Identifier of the token to mint.
     * @param value Amount of token to mint.
     * @param data If `safe` is true, optional data to send along to a receiver contract.
     * @param safe Whether to call a receiver contract.
     */
    function mint(
        address to,
        uint256 id,
        uint256 value,
        bytes calldata data,
        bool safe
    ) external onlyMinter {
        _mint(to, id, value, data, safe, false);
    }

    /**
     * Mints a batch of tokens.
     * @dev Reverts if `ids` and `values` have different lengths.
     * @dev Reverts if `to` is the zero address.
     * @dev Reverts if one of `ids` represents a non-fungible collection.
     * @dev Reverts if one of `ids` represents a non-fungible token and its paired value is not 1.
     * @dev Reverts if one of `ids` represents a non-fungible token which is owned by a non-zero address.
     * @dev Reverts if one of `ids` represents a fungible collection and its paired value is 0.
     * @dev Reverts if one of `ids` represents a fungible collection and there is an overflow of supply.
     * @dev Reverts if `safe` is true and the call to the receiver contract fails or is refused.
     * @dev Emits an {IERC1155-TransferBatch} event.
     * @param to Address of the new tokens owner.
     * @param ids Identifiers of the tokens to mint.
     * @param values Amounts of tokens to mint.
     * @param data Optional data to send along to a receiver contract.
     * @param safe Whether to call a receiver contract.
     */
    function batchMint(
        address to,
        uint256[] calldata ids,
        uint256[] calldata values,
        bytes calldata data,
        bool safe
    ) external onlyMinter {
        _batchMint(to, ids, values, data, safe);
    }

    /**
     * Mints a batch of non-fungible tokens belonging to the same collection and calls the receiver function if the receiver is a contract.
     * @dev Reverts if `to` is the zero address.
     * @dev Reverts if one of `nftIds` does not represent a non-fungible token.
     * @dev Reverts if one of `nftIds` represents a non-fungible token which is owned by a non-zero address.
     * @dev Reverts if two of `nftIds` have a different collection.
     * @dev Reverts if `safe` is true and the call to the receiver contract fails or is refused.
     * @dev Emits an {IERC1155-TransferBatch} event.
     * @param to Address of the new tokens owner.
     * @param nftIds Identifiers of the tokens to mint.
     * @param data Optional data to send along to a receiver contract.
     * @param safe Whether to call a receiver contract.
     */
    function sameNFTCollectionSafeBatchMint(
        address to,
        uint256[] calldata nftIds,
        bytes calldata data,
        bool safe
    ) external onlyMinter {
        _sameNFTCollectionBatchMint(to, nftIds, data, safe);
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
        _burnFrom(from, id, value, false, _UNUSED_BOOL);
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

    /**
     * Burns multiple non-fungible tokens belonging to the same collection.
     * @dev Reverts if the sender is not approved.
     * @dev Reverts if one of `nftIds` does not represent a non-fungible token.
     * @dev Reverts if one of `nftIds` is not owned by `from`.
     * @dev Reverts if there are different collections for `nftIds`.
     * @dev Emits an {IERC1155-TransferBatch} event.
     * @param from address address that will own the minted tokens
     * @param nftIds uint256[] identifiers of the tokens to be minted
     */
    function sameNFTCollectionBatchBurnFrom(address from, uint256[] calldata nftIds) external {
        _sameNFTCollectionBatchBurnFrom(from, nftIds);
    }

    // ===================================================================================================
    //                                  ERC1155 Internal Functions
    // ===================================================================================================

    function _uri(uint256 id) internal override(ERC1155Inventory, BaseMetadataURI) view returns (string memory) {
        return BaseMetadataURI._uri(id);
    }
}

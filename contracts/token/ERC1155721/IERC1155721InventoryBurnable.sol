// SPDX-License-Identifier: MIT

pragma solidity 0.6.8;

import "../ERC1155/IERC1155InventoryBurnable.sol";

/**
 * @title IERC1155721InventoryBurnable interface
 * The devdoc of the functions in this interface overrides the devdoc in the parent interfaces.
 */
interface IERC1155721InventoryBurnable is IERC1155InventoryBurnable {
    /**
     * Burns some token.
     * @dev Reverts if the sender is not approved.
     * @dev Reverts if `id` does not represent a token.
     * @dev Reverts if `id` represents a fungible token and `value` is 0.
     * @dev Reverts if `id` represents a fungible token and `value` is higher than `from`'s balance.
     * @dev Reverts if `id` represents a non-fungible token and `value` is not 1.
     * @dev Reverts if `id` represents a non-fungible token which is not owned by `from`.
     * @dev Emits an {IERC721-Transfer} event if `id` is a non-fungible token.
     * @dev Emits an {IERC1155-TransferSingle} event.
     * @param from Address of the current token owner.
     * @param id Identifier of the token to burn.
     * @param value Amount of token to burn.
     */
    // function burnFrom(address from, uint256 id, uint256 value) external;

    /**
     * Burns multiple tokens.
     * @dev Reverts if `ids` and `values` have different lengths.
     * @dev Reverts if the sender is not approved.
     * @dev Reverts if one of `ids` does not represent a token.
     * @dev Reverts if one of `ids` represents a fungible token and `value` is 0.
     * @dev Reverts if one of `ids` represents a fungible token and `value` is higher than `from`'s balance.
     * @dev Reverts if one of `ids` represents a non-fungible token and `value` is not 1.
     * @dev Reverts if one of `ids` represents a non-fungible token which is not owned by `from`.
     * @dev Emits an {IERC721-Transfer} event for each non-fungible token.
     * @dev Emits an {IERC1155-TransferBatch} event.
     * @param from Address of the current tokens owner.
     * @param ids Identifiers of the tokens to burn.
     * @param values Amounts of tokens to burn.
     */
    // function batchBurnFrom(address from, uint256[] calldata ids, uint256[] calldata values) external;
}

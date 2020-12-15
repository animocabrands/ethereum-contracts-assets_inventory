// SPDX-License-Identifier: MIT

pragma solidity 0.6.8;

import "../ERC721/IERC721Mintable.sol";
import "../ERC1155/IERC1155InventoryMintable.sol";

/**
 * @title IERC1155721InventoryMintable Interface
 * The devdoc of the functions in this interface overrides the devdoc in the parent interfaces.
 */
interface IERC1155721InventoryMintable is IERC721Mintable, IERC1155InventoryMintable {

    //====================================== ERC721 ===========================================/

    /**
     * Unsafely mints an NFT.
     * @dev Reverts if `to` is the zero address.
     * @dev Reverts if `nftId` does not represent a non-fungible token.
     * @dev Reverts if `nftId` has already ben minted.
     * @dev Emits an {IERC721-Transfer} event.
     * @dev Emits an {IERC1155-TransferSingle} event.
     * @dev If `to` is a contract and supports ERC1155TokenReceiver, calls {IERC1155TokenReceiver-onERC1155Received} with empty data.
     * @param to Address of the new token owner.
     * @param nftId Identifier of the token to mint.
     */
    // function mint(address to, uint256 nftId) external;

    /**
     * Unsafely mints a batch of NFTs.
     * @dev Reverts if `to` is the zero address.
     * @dev Reverts if one of `nftIds` does not represent a non-fungible token.
     * @dev Reverts if one of `nftIds` has already been minted.
     * @dev Emits up to several {IERC721-Transfer} events.
     * @dev Emits an {IERC1155-TransferSingle} event.
     * @dev If `to` is a contract and supports ERC1155TokenReceiver, calls {IERC1155TokenReceiver-onERC1155BatchReceived} with empty data.
     * @param to Address of the new token owner.
     * @param nftIds Identifiers of the tokens to mint.
     */
    // function batchMint(address to, uint256[] calldata nftIds) external;

    /**
     * Safely mints an NFT.
     * @dev Reverts if `to` is the zero address.
     * @dev Reverts if `nftId` does not represent a non-fungible token.
     * @dev Reverts if `nftId` has already ben minted.
     * @dev Reverts if either {IERC1155TokenReceiver-onERC1155Received} or {IERC721TokenReceiver-onERC721Received} fails or is refused.
     * @dev Reverts if `to` is a contract and the call to {IERC721TokenReceiver-onERC721Received} fails or is refused.
     * @dev Emits an {IERC721-Transfer} event.
     * @dev Emits an {IERC1155-TransferSingle} event.
     * @param to Address of the new token owner.
     * @param nftId Identifier of the token to mint.
     * @param data Optional data to pass along to the receiver call.
     */
    // function safeMint(address to, uint256 nftId, bytes calldata data) external;

    //========================================= ERC1155 ===============================================/

    /**
     * Safely mints some token.
     * @dev Reverts if `to` is the zero address.
     * @dev Reverts if `id` is not a token.
     * @dev Reverts if `id` represents a non-fungible token and `value` is not 1.
     * @dev Reverts if `id` represents a non-fungible token which has already been minted.
     * @dev Reverts if `id` represents a fungible token and `value` is 0.
     * @dev Reverts if `id` represents a fungible token and there is an overflow of supply.
     * @dev Reverts if `to` is a contract and the call to {IERC1155TokenReceiver-onERC1155Received} fails or is refused.
     * @dev If `id` is a non-fungible token, emits an {IERC721-Transfer} event.
     * @dev Emits an {IERC1155-TransferSingle} event.
     * @param to Address of the new token owner.
     * @param id Identifier of the token to mint.
     * @param value Amount of token to mint.
     * @param data Optional data to send along to a receiver contract.
     */
    // function safeMint(address to, uint256 id, uint256 value, bytes calldata data) external;

    /**
     * Safely mints a batch of tokens.
     * @dev Reverts if `ids` and `values` have different lengths.
     * @dev Reverts if `to` is the zero address.
     * @dev Reverts if one of `ids` is not a token.
     * @dev Reverts if one of `ids` represents a non-fungible token and its paired value is not 1.
     * @dev Reverts if one of `ids` represents a non-fungible token which has already been minted.
     * @dev Reverts if one of `ids` represents a fungible token and its paired value is 0.
     * @dev Reverts if one of `ids` represents a fungible token and there is an overflow of supply.
     * @dev Reverts if `to` is a contract and the call to {IERC1155TokenReceiver-onERC1155batchReceived} fails or is refused.
     * @dev Emits a {IERC721-Transfer} event for each non-fungible token minted.
     * @dev Emits an {IERC1155-TransferBatch} event.
     * @param to Address of the new tokens owner.
     * @param ids Identifiers of the tokens to mint.
     * @param values Amounts of tokens to mint.
     * @param data Optional data to send along to a receiver contract.
     */
    // function safeBatchMint(address to, uint256[] calldata ids, uint256[] calldata values, bytes calldata data) external;
}

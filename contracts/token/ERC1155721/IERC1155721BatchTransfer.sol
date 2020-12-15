// SPDX-License-Identifier: MIT

pragma solidity 0.6.8;

import "../ERC721/IERC721BatchTransfer.sol";

/**
 * @title IERC1155721BatchTransfer interface
 * The devdoc of the functions in this interface overrides the devdoc in the parent interfaces.
 */
interface IERC1155721BatchTransfer is IERC721BatchTransfer {
    /**
     * Unnsafely transfers a batch of NFTs to another address.
     * @dev Reverts if `to` is the zero address.
     * @dev Reverts if the sender is not approved.
     * @dev Reverts if one of `nftIds` does not represent a non-fungible token.
     * @dev Reverts if one of `nftIds` is not owned by `from`.
     * @dev Emits up to several {IERC721-Transfer} events.
     * @dev Emits an {IERC1155-TransferBatch} event.
     * @dev If `to` is a contract and supports ERC1155TokenReceiver, calls {IERC1155TokenReceiver-onERC1155BatchReceived} with empty data.
     * @param from Current token owner.
     * @param to Address of the new token owner.
     * @param nftIds Identifiers of the tokens to transfer.
     */
    // function batchTransferFrom(address from, address to, uint256[] memory nftIds) external; 
}

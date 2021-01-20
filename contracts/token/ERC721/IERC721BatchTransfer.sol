// SPDX-License-Identifier: MIT

pragma solidity 0.6.8;

/**
 * @title ERC721 Non-Fungible Token Standard, optional unsafe batchTransfer interface
 * @dev See https://eips.ethereum.org/EIPS/eip-721
 * Note: The ERC-165 identifier for this interface is.
 */
interface IERC721BatchTransfer {
    /**
     * Unsafely transfers a batch of NFTs to another address.
     * @dev Reverts if `to` is the zero address.
     * @dev Reverts if the sender is not approved.
     * @dev Reverts if one of `nftIds` does not represent a non-fungible token.
     * @dev Reverts if one of `nftIds` is not owned by `from`.
     * @dev Emits up to several {IERC721-Transfer} events.
     * @param from Current token owner.
     * @param to Address of the new token owner.
     * @param nftIds Identifiers of the tokens to transfer.
     */
    function batchTransferFrom(
        address from,
        address to,
        uint256[] calldata nftIds
    ) external;
}

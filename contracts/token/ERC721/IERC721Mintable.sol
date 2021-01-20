// SPDX-License-Identifier: MIT

pragma solidity 0.6.8;

/**
 * @title ERC721 Non-Fungible Token Standard, additional minting interface
 * @dev See https://eips.ethereum.org/EIPS/eip-721
 */
interface IERC721Mintable {
    /**
     * Unsafely mints an NFT.
     * @dev Reverts if `to` is the zero address.
     * @dev Reverts if `nftId` does not represent a non-fungible token.
     * @dev Reverts if `nftId` has already ben minted.
     * @dev Emits an {IERC721-Transfer} event.
     * @param to Address of the new token owner.
     * @param nftId Identifier of the token to mint.
     */
    function mint(address to, uint256 nftId) external;

    /**
     * Unsafely mints a batch of NFTs.
     * @dev Reverts if `to` is the zero address.
     * @dev Reverts if one of `nftIds` does not represent a non-fungible token.
     * @dev Reverts if one of `nftIds` has already been minted.
     * @dev Emits up to several {IERC721-Transfer} events.
     * @param to Address of the new token owner.
     * @param nftIds Identifiers of the tokens to mint.
     */
    function batchMint(address to, uint256[] calldata nftIds) external;

    /**
     * Safely mints an NFT.
     * @dev Reverts if `to` is the zero address.
     * @dev Reverts if `nftId` does not represent a non-fungible token.
     * @dev Reverts if `nftId` has already ben minted.
     * @dev Reverts if `to` is a contract and the call to {IERC721TokenReceiver-onERC721Received} fails or is refused.
     * @dev Emits an {IERC721-Transfer} event.
     * @param to Address of the new token owner.
     * @param nftId Identifier of the token to mint.
     * @param data Optional data to pass along to the receiver call.
     */
    function safeMint(
        address to,
        uint256 nftId,
        bytes calldata data
    ) external;
}

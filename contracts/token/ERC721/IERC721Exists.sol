// SPDX-License-Identifier: MIT

pragma solidity ^0.6.8;

/**
 * @title ERC721 Non-Fungible Token Standard, optional exists extension
 * @dev See https://eips.ethereum.org/EIPS/eip-721
 * Note: The ERC-165 identifier for this interface is 0x4f558e79.
 */
interface IERC721Exists {

    /**
     * @dev Checks the existence of an NFT
     * @return bool true if the token belongs to a non-zero address, false otherwise
     */
    function exists(uint256 nftId) external view returns (bool);
}

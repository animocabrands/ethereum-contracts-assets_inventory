// SPDX-License-Identifier: MIT

pragma solidity ^0.6.8;

import "../ERC721/IERC721Exists.sol";

/**
 * @title ERC-1155 Multi Token Standard, optional Asset Collections extension
 * @dev See https://eips.ethereum.org/EIPS/eip-xxxx
 * Interface for fungible/non-fungible collections management on a 1155-compliant contract.
 * This proposal attempts to rationalize the co-existence of fungible and non-fungible tokens
 * within the same contract. We consider that there 3 types of identifiers:
 * (a) Fungible Collections identifiers, each representing a set of Fungible Tokens,
 * (b) Non-Fungible Collections identifiers, each representing a set of Non-Fungible Tokens,
 * (c) Non-Fungible Tokens identifiers.
 *
 * IERC1155 behavior MAY be updated as follow:
 * `balanceOf` and `balanceOfBatch`:
 * - when applied to a Non-Fungible Collection, MAY return the balance of Non-Fungible Tokens for this collection,
 * - when applied to a Non-Fungible Token, SHOULD return 1.
 *
 * Note: The ERC-165 identifier for this interface is 0x469bd23f.
 */
interface IERC1155Collections is IERC721Exists {

    /**
     * @dev Returns whether or not an ID represents a Fungible Collection.
     * @param id The ID to query.
     * @return bool true if id represents a Fungible Collection, false otherwise.
     */
    function isFungible(uint256 id) external view returns (bool);

    /**
     * @dev Returns the parent collection ID of a Non-Fungible Token ID.
     * This function returns either a Fungible Collection ID or a Non-Fungible Collection ID.
     * This function SHOULD NOT be used to check the existence of a Non-Fungible Token.
     * This function MAY return a value for a non-existing Non-Fungible Token.
     * @param id The ID to query. id must represent an existing/non-existing Non-Fungible Token, else it throws.
     * @return uint256 the parent collection ID.
     */
    function collectionOf(uint256 id) external view returns (uint256);

    /**
     * @dev Returns the owner of a Non-Fungible Token.
     * @param nftId The identifier to query. MUST represent an existing Non-Fungible Token, else it throws.
     * @return owner address currently marked as the owner of the Non-Fungible Token.
     */
    function ownerOf(uint256 nftId) external view returns (address owner);
}

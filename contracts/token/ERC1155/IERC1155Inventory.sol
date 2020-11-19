// SPDX-License-Identifier: MIT

pragma solidity 0.6.8;


/**
 * @title ERC-1155 Multi Token Standard, optional Asset Collections extension
 * @dev See https://eips.ethereum.org/EIPS/eip-xxxx
 * Interface for fungible/non-fungible collections management on a 1155-compliant contract.
 * This proposal attempts to rationalize the co-existence of fungible and non-fungible tokens
 * within the same contract. We consider that there 3 types of identifiers:
 * (a) Fungible Collections identifiers, each representing a set of Fungible Tokens,
 * (b) Non-Fungible Collections identifiers, each representing a set of Non-Fungible Tokens,
 * (c) Non-Fungible Tokens identifiers. 


 * In the same way a fungible token (represented by its balance) belongs to a particular id
 * which can be used to store common information about this token, including the metadata.
 *
 * Note: The ERC-165 identifier for this interface is 0x469bd23f.
 */
interface IERC1155Inventory {

    /**
     * Event emitted when a collection is created.
     *  This event SHOULD NOT be emitted twice for the same `id`.
     * 
     *  The parameters in the functions `collectionOf` and `ownerOf` are required to be
     *  non-fungible token identifiers, so they should not be called with any collection
     *  identifiers, else they will revert.
     * 
     *  On the contrary, the functions `balanceOf`, `balanceOfBatch` and `totalSupply` are
     *  best used with collection identifiers, which will return meaningful information for
     *  the owner.
     */
    event CollectionCreated (uint256 indexed collectionId, bool indexed fungible);

    /**
     * Introspects whether or not `id` represents a fungible collection.
     *  This function MAY return true even if `id` represents a fungible collections which is not-yet created (`CollectionCreated` not emitted).
     * @param id The identifier to query.
     * @return bool True if `id` represents a fungible collection, false otherwise.
     */
    function isFungible(uint256 id) external view returns (bool);

    /**
     * Introspects the non-fungible collection to which `nftId` belongs.
     *  This function MUST return a value representing a non-fungible collection.
     *  This function MAY return a value for a non-existing token, and SHOULD NOT be used to check the existence of a non-fungible token.
     * @dev Reverts if `nftId` does not represent a non-fungible token.
     * @param nftId The token identifier to query the collection of.
     * @return uint256 the non-fungible collection identifier to which `nftId` belongs.
     */
    function collectionOf(uint256 nftId) external view returns (uint256);

    /**
     * Retrieves the owner of a non-fungible token.
     * @dev Reverts if `nftId` is owned by the zero address. // ERC721 compatibility
     * @dev Reverts if `nftId` does not represent a non-fungible token.
     * @param nftId The token identifier to query.
     * @return Address of the current owner of the token.
     */
    function ownerOf(uint256 nftId) external view returns (address);

    /**
     * Retrieves the total supply of `id`.
     *  If `id` represents a fungible or non-fungible collection, returns the supply of tokens for this collection.
     *  If `id` represents a non-fungible token, returns 1 if the token exists, else 0.
     * @param id The identifier for which to retrieve the supply of.
     * @return The supplies for each identifier in `ids`.
     */
    function totalSupply(uint256 id) external view returns (uint256);

    /**
     * @notice this definition replaces the original {ERC1155-balanceOf}.
     * Retrieves the balance of `id` owned by account `owner`.
     *  If `id` represents a fungible or non-fungible collection, returns the balance of tokens for this collection.
     *  If `id` represents a non-fungible token, returns 1 if the token is owned by `owner`, else 0.
     * @param owner The account to retrieve the balance of.
     * @param id The identifier to retrieve the balance of.
     * @return The balance of `id` owned by account `owner`.
     */
    // function balanceOf(address owner, uint256 id) external view returns (uint256);

    /**
     * @notice this definition replaces the original {ERC1155-balanceOfBatch}.
     * Retrieves the balances of `ids` owned by accounts `owners`. For each pair:
     *  if `id` represents a fungible or non-fungible collection, returns the balance of tokens for this collection,
     *  if `id` represents a non-fungible token, returns 1 if the token is owned by `owner`, else 0.
     * @param owners The addresses of the token holders
     * @param ids The identifiers to retrieve the balance of.
     * @return The balances of `ids` owned by accounts `owners`.
     */
    // function balanceOfBatch(
    //     address[] calldata owners,
    //     uint256[] calldata ids
    // ) external view returns (uint256[] memory);
}

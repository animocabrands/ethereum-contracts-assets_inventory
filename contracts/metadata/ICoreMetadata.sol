// SPDX-License-Identifier: MIT

pragma solidity ^0.6.8;

/**
 * @dev Interface for retrieving core metadata attributes encoded in an integer
 * and based on a specific bits layout. A layout consists of a mapping of names
 * to bits position inside a uint256. The position is characterised by a length
 * and an index and must remain in the bounds of 256 bits. Positions of a layout
 * may overlap.
 * Note that these functions are expected to work for any integer provided and
 * should not be expected to have knowledge of the existence of a token in a
 * specific contract.
 */
interface ICoreMetadata {

    /**
     * @dev Retrieve the value of a specific attribute for an integer
     * @param integer uint256 the integer to query the attribute for
     * @param name bytes32 the name of the attribute to retrieve
     * @return value uint256 the value of the attribute
     */
    function getAttribute(
        uint256 integer,
        bytes32 name
    ) external view returns (uint256 value);

    /**
     * @dev Retrieve the whole core metadata for an integer
     * @param integer uint256 the integer to query the metadata for
     * @return names bytes32[] the names of the metadata attributes
     * @return values uint256[] the values of the metadata attributes
     */
    function getAttributes(uint256 integer) external view returns (
        bytes32[] memory names,
        uint256[] memory values
    );
}

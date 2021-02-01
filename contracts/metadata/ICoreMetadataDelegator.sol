// SPDX-License-Identifier: MIT

pragma solidity 0.6.8;

/**
 * @dev Interface for an Inventory Metadata Delegator.
 */
interface ICoreMetadataDelegator {
    /**
     * @dev Get the address of the delegator contract.
     */
    function coreMetadataImplementer() external view returns (address);
}

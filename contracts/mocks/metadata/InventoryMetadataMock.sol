// SPDX-License-Identifier: MIT

pragma solidity 0.6.8;

import "../../metadata/InventoryMetadata.sol";

contract InventoryMetadataMock is InventoryMetadata {

    constructor(
        uint256 nfCollectionMaskLength,
        address inventoryContract
    ) public InventoryMetadata(nfCollectionMaskLength, inventoryContract) {}

    function getLayout(uint256 collectionId) external view returns (
        bytes32[] memory names,
        uint256[] memory lengths,
        uint256[] memory indices
    ) {
        return _getLayout(collectionId);
    }

    function setLayout(
        uint256 collectionId,
        bytes32[] calldata names,
        uint256[] calldata lengths,
        uint256[] calldata indices
    ) external {
        _setLayout(collectionId, names, lengths, indices);
    }

    function clearLayout(uint256 collectionId) external {
        _clearLayoutByCollectionId(collectionId);
    }
}

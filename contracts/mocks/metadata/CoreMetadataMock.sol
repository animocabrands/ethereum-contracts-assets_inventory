// SPDX-License-Identifier: MIT

pragma solidity 0.6.8;

import "../../metadata/CoreMetadata.sol";

contract CoreMetadataMock is CoreMetadata {

    constructor() public {}

    function getLayout() external view returns (
        bytes32[] memory names,
        uint256[] memory lengths,
        uint256[] memory indices
    ) {
        return _getLayout();
    }

    function setLayout(
        bytes32[] calldata names,
        uint256[] calldata lengths,
        uint256[] calldata indices
    ) external {
        _setLayout(names, lengths, indices);
    }

    function clearLayout() external {
        _clearLayout();
    }
}

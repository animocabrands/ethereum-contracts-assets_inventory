// SPDX-License-Identifier: MIT

pragma solidity ^0.6.8;

import "./AssetsInventoryMock.sol";

contract BurnableInventoryMock is AssetsInventoryMock {

    constructor(uint256 nfMaskLength) public AssetsInventoryMock(nfMaskLength) { }

    function burnFrom(
        address from,
        uint256 id,
        uint256 value
    ) external virtual
    {
        _burnFrom(from, id, value);
    }
}

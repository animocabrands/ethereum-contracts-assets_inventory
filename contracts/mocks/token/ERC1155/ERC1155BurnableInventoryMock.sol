pragma solidity ^0.6.6;

import "./ERC1155AssetsInventoryMock.sol";

contract ERC1155BurnableInventoryMock is ERC1155AssetsInventoryMock {

    constructor(uint256 nfMaskLength) public ERC1155AssetsInventoryMock(nfMaskLength) { }

    function burnFrom(
        address from,
        uint256 id,
        uint256 value
    ) external virtual
    {
        _burnFrom(from, id, value);
    }
}

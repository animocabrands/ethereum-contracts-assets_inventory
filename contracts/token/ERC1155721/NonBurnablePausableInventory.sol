pragma solidity = 0.5.16;

import "./PausableInventory.sol";

/**
    @title NonBurnablePausableInventory, a non-burnable inventory contract with pausable collections
 */
contract NonBurnablePausableInventory is PausableInventory
{

    constructor(uint256 nfMaskLength) public PausableInventory(nfMaskLength)  {}

    modifier notZero(address addr) {
        require(addr != address(0x0));
        _;
    }

    function safeTransferFrom(
        address from,
        address to,
        uint256 id,
        uint256 value,
        bytes memory data
    ) public notZero(to) {
        super.safeTransferFrom(from, to, id, value, data);
    }

    function safeBatchTransferFrom(
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory values,
        bytes memory data
    ) public notZero(to) {
        super.safeBatchTransferFrom(from, to, ids, values, data);
    }

    function _transferFrom(address from, address to, uint256 tokenId, bytes memory data, bool safe
    ) internal notZero(to) {
        super._transferFrom(from, to, tokenId, data, safe);
    }
}

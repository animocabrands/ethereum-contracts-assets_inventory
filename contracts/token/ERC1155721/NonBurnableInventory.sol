pragma solidity ^0.6.6;

import "./AssetsInventory.sol";

/**
    @title NonBurnableInventory, a non-burnable inventory contract
 */
abstract contract NonBurnableInventory is AssetsInventory
{

    constructor(uint256 nfMaskLength) internal AssetsInventory(nfMaskLength)  {}

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
    ) public virtual override notZero(to) {
        super.safeTransferFrom(from, to, id, value, data);
    }

    function safeBatchTransferFrom(
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory values,
        bytes memory data
    ) public virtual override notZero(to) {
        super.safeBatchTransferFrom(from, to, ids, values, data);
    }

    function _transferFrom(address from, address to, uint256 tokenId, bytes memory data, bool safe
    ) internal virtual override notZero(to) {
        super._transferFrom(from, to, tokenId, data, safe);
    }
}

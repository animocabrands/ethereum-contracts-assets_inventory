// SPDX-License-Identifier: MIT

pragma solidity 0.6.8;

import "./ERC1155721InventoryMock.sol";

contract ERC1155721InventoryFullMock is ERC1155721InventoryMock, IERC1155721BatchTransfer, IERC1155721InventoryBurnable {

    // ===================================================================================================
    //                                 User Public Functions
    // ===================================================================================================

    /**
     * @dev See {IERC1155721BatchTransfer-batchTransferFrom(address,address,uint256[])}.
     */
    function batchTransferFrom(
        address from,
        address to,
        uint256[] calldata nftIds
    ) external override {
        _batchTransferFrom_ERC721(from, to, nftIds);
    }

    /**
     * @dev See {IERC1155721InventoryBurnable-burnFrom(address,uint256,uint256)}.
     */
    function burnFrom(
        address from,
        uint256 id,
        uint256 value
    ) external override {
        _burnFrom(from, id, value);
    }

    /**
     * @dev See {IERC1155721InventoryBurnable-batchBurnFrom(address,uint256[],uint256[])}.
     */
    function batchBurnFrom(
        address from,
        uint256[] calldata ids,
        uint256[] calldata values
    ) external override {
        _batchBurnFrom(from, ids, values);
    }
}

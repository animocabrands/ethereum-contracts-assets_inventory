// SPDX-License-Identifier: MIT

pragma solidity ^0.6.8;

import "@openzeppelin/contracts/introspection/ERC165.sol";
import "./IERC1155TokenReceiver.sol";

abstract contract ERC1155TokenReceiver is IERC1155TokenReceiver, ERC165 {

    // bytes4(keccak256("onERC1155Received(address,address,uint256,uint256,bytes)"))
    bytes4 internal constant _ERC1155_RECEIVED = 0xf23a6e61;

    // bytes4(keccak256("onERC1155BatchReceived(address,address,uint256[],uint256[],bytes)"))
    bytes4 internal constant _ERC1155_BATCH_RECEIVED = 0xbc197c81;

    bytes4 internal constant _ERC1155_REJECTED = 0xffffffff;

    constructor() internal {
        _registerInterface(type(IERC1155TokenReceiver).interfaceId);
    }

    function onERC1155Received(
        address operator,
        address from,
        uint256 id,
        uint256 value,
        bytes memory data
    ) public override returns (bytes4)
    {
        bool accept = _onERC1155Received(operator, from, id, value, data);
        return accept? _ERC1155_RECEIVED: _ERC1155_REJECTED;
    }

    function onERC1155BatchReceived(
        address operator,
        address from,
        uint256[] memory ids,
        uint256[] memory values,
        bytes memory data
    ) public override returns (bytes4)
    {
        bool accept = _onERC1155BatchReceived(operator, from, ids, values, data);
        return accept? _ERC1155_BATCH_RECEIVED: _ERC1155_REJECTED;
    }

    function _onERC1155Received(
        address operator,
        address from,
        uint256 id,
        uint256 value,
        bytes memory data
    ) internal virtual returns (bool);


    function _onERC1155BatchReceived(
        address operator,
        address from,
        uint256[] memory ids,
        uint256[] memory values,
        bytes memory data
    ) internal virtual returns (bool);
}

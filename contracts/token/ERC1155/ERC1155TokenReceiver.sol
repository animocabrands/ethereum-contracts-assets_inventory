// SPDX-License-Identifier: MIT

pragma solidity 0.6.8;

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
}

// SPDX-License-Identifier: MIT

pragma solidity ^0.6.8;

import "@openzeppelin/contracts/introspection/ERC165.sol";
import "./IERC721Receiver.sol";

abstract contract ERC721Receiver is IERC721Receiver, ERC165 {

    bytes4 internal constant _ERC721_RECEIVED = type(IERC721Receiver).interfaceId;
    bytes4 internal constant _ERC721_REJECTED = 0xffffffff;

    constructor() internal {
        _registerInterface(type(IERC721Receiver).interfaceId);
    }
}

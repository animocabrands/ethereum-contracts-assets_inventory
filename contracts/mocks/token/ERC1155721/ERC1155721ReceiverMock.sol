// SPDX-License-Identifier: MIT

pragma solidity 0.6.8;

import "../ERC721/ERC721ReceiverMock.sol";
import "../ERC1155/ERC1155TokenReceiverMock.sol";

contract ERC1155721ReceiverMock is ERC721ReceiverMock, ERC1155TokenReceiverMock {

    constructor(
        bool supports721,
        bool supports1155
    ) public ERC721ReceiverMock(supports721) ERC1155TokenReceiverMock(supports1155) {}
}

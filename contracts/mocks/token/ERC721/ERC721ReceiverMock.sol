// SPDX-License-Identifier: MIT

pragma solidity ^0.6.8;

import "../../../token/ERC721/ERC721Receiver.sol";

contract ERC721ReceiverMock is ERC721Receiver {

    event Received(
        address operator,
        address from,
        uint256 tokenId,
        bytes data,
        uint256 gas
    );

    bool internal _accept721;

    constructor(bool accept721) public ERC721Receiver() {
        _accept721 = accept721;
    }

    function _onERC721Received(
        address operator,
        address from,
        uint256 tokenId,
        bytes memory data
    ) internal virtual override returns(bool)
    {
        if (_accept721) {
            emit Received(operator, from, tokenId, data, gasleft());
            return true;
        } else {
            return false;
        }
    }
}

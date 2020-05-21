// SPDX-License-Identifier: MIT

pragma solidity ^0.6.8;

import "@openzeppelin/contracts/introspection/ERC165.sol";
import "./IERC721Receiver.sol";

abstract contract ERC721Receiver is IERC721Receiver, ERC165 {

    bytes4 constant private _INTERFACE_ID_ERC721Receiver = type(IERC721Receiver).interfaceId;
    bytes4 constant internal _ERC721_RECEIVED = _INTERFACE_ID_ERC721Receiver;
    bytes4 constant internal _ERC721_REJECTED = 0xffffffff;

    constructor() internal {
        _registerInterface(_INTERFACE_ID_ERC721Receiver);
    }

    /**
     * @dev Internal function which implements the logic of the receiver
     * @ param operator address the operator for the transfer function
     * @ param from address the previous owner of the token
     * @ param tokenId uint256 the identifier of the token
     * @ param data bytes optional data
     * @return bool whether the reception is accepted
     */
    function _onERC721Received(
        address operator,
        address from,
        uint256 tokenId,
        bytes memory data
    ) internal virtual returns(bool);

    function onERC721Received(
        address operator,
        address from,
        uint256 tokenId,
        bytes memory data
    ) public override returns(bytes4)
    {
        bool accept = _onERC721Received(operator, from, tokenId, data);
        return accept? _ERC721_RECEIVED: _ERC721_REJECTED;
    }
}

// SPDX-License-Identifier: MIT

pragma solidity 0.6.8;

import "@openzeppelin/contracts/introspection/IERC165.sol";
import "./IERC721Receiver.sol";

abstract contract ERC721Receiver is IERC721Receiver, IERC165 {
    bytes4 private constant _ERC165_INTERFACE_ID = type(IERC165).interfaceId;
    bytes4 private constant _ERC721_RECEIVER_INTERFACE_ID = type(IERC721Receiver).interfaceId;

    bytes4 internal constant _ERC721_RECEIVED = type(IERC721Receiver).interfaceId;
    bytes4 internal constant _ERC721_REJECTED = 0xffffffff;

    /**
     * @dev See {IERC165-supportsInterface}.
     */
    function supportsInterface(bytes4 interfaceId) public view virtual override returns (bool) {
        return 
            interfaceId == _ERC165_INTERFACE_ID ||
            interfaceId == _ERC721_RECEIVER_INTERFACE_ID;
    }
}

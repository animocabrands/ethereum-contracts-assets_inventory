// SPDX-License-Identifier: MIT

pragma solidity ^0.6.8;

import "../../../token/ERC1155/IERC1155TokenReceiver.sol";

contract ERC1155TokenReceiverMock is IERC1155TokenReceiver {

    event ReceivedSingle(
        address operator,
        address from,
        uint256 tokenId,
        uint256 supply,
        bytes data,
        uint256 gas
    );

    event ReceivedBatch(
        address operator,
        address from,
        uint256[] tokenIds,
        uint256[] supplies,
        bytes data,
        uint256 gas
    );

    // bytes4(keccak256("onERC1155Received(address,address,uint256,uint256,bytes)"))
    bytes4 constant internal ERC1155_RECEIVED = 0xf23a6e61;

    // bytes4(keccak256("onERC1155BatchReceived(address,address,uint256[],uint256[],bytes)"))
    bytes4 constant internal ERC1155_BATCH_RECEIVED = 0xbc197c81;

    bytes4 constant internal ERC1155_REJECTED = 0xffffffff;

    bool internal _useCorrect1155Retval;

    constructor(bool useCorrectRetval) public {
        _useCorrect1155Retval = useCorrectRetval;
    }

    function onERC1155Received(
        address operator,
        address from,
        uint256 id,
        uint256 value,
        bytes calldata data
    ) external override returns(bytes4)
    {
        if (_useCorrect1155Retval) {
            emit ReceivedSingle(operator, from, id, value, data, gasleft());
            return ERC1155_RECEIVED;
        } else {
            return ERC1155_REJECTED;
        }
    }

    function onERC1155BatchReceived(
        address operator,
        address from,
        uint256[] calldata ids,
        uint256[] calldata values,
        bytes calldata data
    ) external override returns(bytes4)
    {
        if (_useCorrect1155Retval) {
            emit ReceivedBatch(operator, from, ids, values, data, gasleft());
            return ERC1155_BATCH_RECEIVED;
        } else {
            return ERC1155_REJECTED;
        }
    }
}

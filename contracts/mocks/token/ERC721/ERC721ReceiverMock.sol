pragma solidity ^0.6.6;

import "../../../token/ERC721/IERC721Receiver.sol";

contract ERC721ReceiverMock is IERC721Receiver {

    event Received(
        address operator,
        address from,
        uint256 tokenId,
        bytes data,
        uint256 gas
    );

    //bytes4(keccak256("onERC721Received(address,address,uint256,bytes)"))
    bytes4 constant internal ERC721_RECEIVED = 0x150b7a02;

    bytes4 constant internal ERC721_REJECTED = 0xffffffff;

    bool internal _useCorrect721Retval;

    constructor(bool useCorrectRetval) public {
        _useCorrect721Retval = useCorrectRetval;
    }

    function onERC721Received(
        address operator,
        address from,
        uint256 tokenId,
        bytes memory data
    ) public override returns(bytes4)
    {
        if (_useCorrect721Retval) {
            emit Received(operator, from, tokenId, data, gasleft());
            return ERC721_RECEIVED;
        } else {
            return ERC721_REJECTED;
        }
    }
}

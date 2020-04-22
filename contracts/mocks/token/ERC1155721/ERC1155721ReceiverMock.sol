pragma solidity = 0.5.16;

// import "../token/ERC721/IERC721TokenReceiver.sol";
import "../../../token/ERC721/IERC721Receiver.sol";
import "../../../token/ERC1155/IERC1155TokenReceiver.sol";

contract ERC1155721ReceiverMock is IERC721Receiver, IERC1155TokenReceiver {

    bool _accept721;
    bool _accept1155;

    bytes4 constant private WRONG_RETURN_VALUE = 0xffffffff;

    event Received(address operator, address from, uint256 tokenId, bytes data, uint256 gas);
    event ReceivedSingle(address operator, address from, uint256 tokenId, uint256 supply, bytes data, uint256 gas);
    event ReceivedBatch(address operator, address from, uint256[] tokenIds, uint256[] supplies, bytes data, uint256 gas);

    constructor(bool accept721, bool accept1155) public {
        _accept721 = accept721;
        _accept1155 = accept1155;
    }

    function onERC721Received(address operator, address from, uint256 tokenId, bytes memory data
    ) public returns(bytes4) {
        if (_accept721) {
            emit Received(operator, from, tokenId, data, gasleft());
            return ERC721_RECEIVED;
        } else {
            return WRONG_RETURN_VALUE;
        }
    }

    function onERC1155Received(
        address operator,
        address from,
        uint256 id,
        uint256 value,
        bytes calldata data
    ) external returns(bytes4){
        if (_accept1155) {
            emit ReceivedSingle(operator, from, id, value, data, gasleft());
            return ERC1155_RECEIVED;
        } else {
            return WRONG_RETURN_VALUE;
        }
    }

    function onERC1155BatchReceived(
        address operator,
        address from,
        uint256[] calldata ids,
        uint256[] calldata values,
        bytes calldata data
    ) external returns(bytes4){
        if (_accept1155) {
            emit ReceivedBatch(operator, from, ids, values, data, gasleft());
            return ERC1155_BATCH_RECEIVED;
        } else {
            return WRONG_RETURN_VALUE;
        }
    }
}
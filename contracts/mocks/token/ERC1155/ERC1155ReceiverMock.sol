pragma solidity = 0.6.2;

import "../../../token/ERC1155/IERC1155TokenReceiver.sol";

contract ERC1155ReceiverMock is IERC1155TokenReceiver {

    bool private allowTokensReceived;
    bool private returnCorrectBytes;
    bool private allowBatchTokensReceived;
    bool private returnCorrectBytesOnBatch;

    address private owner;
    address private tokenContract;
    mapping(uint256 => bool) private tokens;

    bytes4 constant private ERC1155_REJECTED = 0xafed434d;

    event Received(address operator, address from, uint256 tokenId, uint256 supply, bytes data, uint256 gas);
    event ReceivedBatch(address operator, address from, uint256[] tokenIds, uint256[] supplies, bytes data, uint256 gas);

    constructor(
        address _tokenContract,
        bool _allowTokensReceived,
        bool _returnCorrectBytes,
        bool _allowBatchTokensReceived,
        bool _returnCorrectBytesOnBatch
    ) public {
        tokenContract = _tokenContract;
        allowTokensReceived = _allowTokensReceived;
        returnCorrectBytes = _returnCorrectBytes;
        allowBatchTokensReceived = _allowBatchTokensReceived;
        returnCorrectBytesOnBatch = _returnCorrectBytesOnBatch;

        owner = msg.sender;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "only owner allowed");
        _;
    }

    function onERC1155Received(
        address _operator,
        address _from,
        uint256 _id,
        uint256 _value,
        bytes calldata _data
    ) external override returns(bytes4){
        require(address(tokenContract) == msg.sender, "only accept tokenContract as sender");
        if (!allowTokensReceived) {
            return ERC1155_REJECTED;
        }

        emit Received(_operator, _from, _id, _value, _data, gasleft());

        if(returnCorrectBytes) {
            return ERC1155_RECEIVED;
        } else {
            return 0x150b7a03;
        }
    }

    function onERC1155BatchReceived(
        address _operator,
        address _from,
        uint256[] calldata _ids,
        uint256[] calldata _values,
        bytes calldata _data
    ) external override returns(bytes4){
        require(address(tokenContract) == msg.sender, "only accept tokenContract as sender");
        if (!allowBatchTokensReceived) {
            return ERC1155_REJECTED;
        }

        emit ReceivedBatch(_operator, _from, _ids, _values, _data, gasleft());

        if(returnCorrectBytesOnBatch) {
            return ERC1155_BATCH_RECEIVED;
        } else {
            return 0x150b7a03;
        }
    }

    function acceptTokens() public onlyOwner { allowTokensReceived = true; }
    function rejectTokens() public onlyOwner { allowTokensReceived = false; }

    function acceptBatchTokens() public onlyOwner { allowBatchTokensReceived = true; }
    function rejectBatchTokens() public onlyOwner { allowBatchTokensReceived = false; }
}

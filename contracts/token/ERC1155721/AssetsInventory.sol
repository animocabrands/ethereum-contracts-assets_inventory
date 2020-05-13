pragma solidity ^0.6.6;

import "./../ERC721/IERC721Metadata.sol";
import "./../ERC721/IERC721Receiver.sol";
import "./../ERC1155/ERC1155AssetsInventory.sol";

/**
    @title AssetsInventory, a contract which manages up to multiple collections of fungible and non-fungible tokens
    @dev In this implementation, with N representing the non-fungible bitmask length, IDs are composed as follow:
    (a) Fungible Collection IDs:
        - most significant bit == 0
    (b) Non-Fungible Collection IDs:
        - most significant bit == 1
        - (256-N) least significant bits == 0
    (c) Non-Fungible Token IDs:
        - most significant bit == 1
        - (256-N) least significant bits != 0

    If non-fungible bitmask length == 1, there is one Non-Fungible Collection represented by the most significant bit set to 1 and other bits set to 0.
    If non-fungible bitmask length > 1, there are multiple Non-Fungible Collections.
 */
abstract contract AssetsInventory is IERC721, IERC721Metadata, ERC1155AssetsInventory
{
    using SafeMath for uint256;
    using Address for address;

    // ERC165 Interface Ids
    bytes4 constant internal ERC721_InterfaceId = 0x80ac58cd;
    bytes4 constant internal ERC721Metadata_InterfaceId = 0x5b5e139f;
    bytes4 constant internal ERC721Exists_InterfaceId = 0x4f558e79;
    bytes4 constant internal ERC1155TokenReceiver_InterfaceId = 0x4e2312e0;

    //bytes4(keccak256("onERC721Received(address,address,uint256,bytes)"))
    bytes4 constant internal ERC721_RECEIVED = 0x150b7a02;

    // id (nft) => operator
    mapping(uint256 => address) internal _nftApprovals;

    // owner => nb nfts owned
    mapping(address => uint256) internal _nftBalances;

    /**
     * @dev Constructor function
     * @param nfMaskLength number of bits in the Non-Fungible Collection mask
     */
    constructor(uint256 nfMaskLength) internal ERC1155AssetsInventory(nfMaskLength) {}

/////////////////////////////////////////// ERC165 /////////////////////////////////////////////

    function supportsInterface(
        bytes4 interfaceId
    ) public virtual override(ERC1155AssetsInventory, IERC165) view returns (bool)
    {
        return (
            super.supportsInterface(interfaceId) ||
            interfaceId == ERC721_InterfaceId ||
            interfaceId == ERC721Metadata_InterfaceId ||
            interfaceId == ERC721Exists_InterfaceId
        );
    }
/////////////////////////////////////////// ERC721 /////////////////////////////////////////////

    function balanceOf(address tokenOwner) public virtual override view returns (uint256) {
        require(tokenOwner != address(0), "AssetsInventory: balance of the zero address");
        return _nftBalances[tokenOwner];
    }

    function ownerOf(uint256 nftId) public virtual override(IERC721, ERC1155AssetsInventory) view returns (address)
    {
        return super.ownerOf(nftId);
    }

    function approve(address to, uint256 nftId) public virtual override {
        address tokenOwner = ownerOf(nftId);
        require(to != tokenOwner, "AssetsInventory: approve to approved user");

        address sender = _msgSender();
        require(
            (sender == tokenOwner) || _operatorApprovals[tokenOwner][sender],
            "AssetsInventory: approve by non-operator user"
        );

        _nftApprovals[nftId] = to;
        emit Approval(tokenOwner, to, nftId);
    }

    function getApproved(uint256 nftId) public virtual override view returns (address) {
        require(
            isNFT(nftId) && _exists(nftId),
            "AssetsInventory: getting approval of an incorrect or non-existing NFT"
        );
        return _nftApprovals[nftId];
    }

    function isApprovedForAll(
        address tokenOwner,
        address operator
    ) public virtual override(IERC721, ERC1155AssetsInventory) view returns(bool)
    {
        return super.isApprovedForAll(tokenOwner, operator);
    }

    function setApprovalForAll(
        address operator,
        bool approved
    ) public virtual override(IERC721, ERC1155AssetsInventory)
    {
        return super.setApprovalForAll(operator, approved);
    }

    function transferFrom(address from, address to, uint256 nftId) public virtual override {
        _transferFrom(from, to, nftId, "", false);
    }

    function safeTransferFrom(address from, address to, uint256 nftId) public virtual override {
        _transferFrom(from, to, nftId, "", true);
    }

    function safeTransferFrom(address from, address to, uint256 nftId, bytes memory data) public virtual override {
        _transferFrom(from, to, nftId, data, true);
    }

    function tokenURI(uint256 nftId) external virtual override view returns (string memory) {
        require(_exists(nftId), "AssetsInventory: token URI of non-existing NFT");
        return _uri(nftId);
    }

/////////////////////////////////////////// Transfer Internal Functions ///////////////////////////////////////

    /**
     * @dev Internal function to transfer the ownership of a given NFT to another address
     * Emits Transfer and TransferSingle events
     * Requires the msg sender to be the owner, approved, or operator
     * @param from current owner of the token
     * @param to address to receive the ownership of the given token ID
     * @param nftId uint256 ID of the token to be transferred
     * @param safe bool to indicate whether the transfer is safe
    */
    function _transferFrom(
        address from,
        address to,
        uint256 nftId,
        bytes memory data,
        bool safe
    ) internal virtual
    {
        address sender = _msgSender();
        bool operatable = (from == sender) || _operatorApprovals[from][sender];

        _transferNonFungible(from, to, nftId, operatable, false);

        emit TransferSingle(sender, from, to, nftId, 1);

        _callOnERC721Received(from, to, nftId, data, safe);
    }

    function _transferNonFungible(
        address from,
        address to,
        uint256 nftId,
        bool operatable,
        bool burn
    ) internal virtual override
    {
        require(
            operatable || (_nftApprovals[nftId] == _msgSender()),
            "ERC1155: transfer of a non-owned NFT"
        );

        _nftApprovals[nftId] = address(0);

        _nftBalances[from] = _nftBalances[from].sub(1);

        if (!burn) {
            _nftBalances[to] = _nftBalances[to].add(1);
        }

        emit Transfer(from, to, nftId);

        super._transferNonFungible(
            from,
            to,
            nftId,
            true,
            burn
        );
    }

/////////////////////////////////////////// Minting ///////////////////////////////////////

    function _mintNonFungible(
        address to,
        uint256 nftId,
        bytes memory data,
        bool batch,
        bool safe
    ) internal virtual override
    {
        _nftBalances[to] = _nftBalances[to].add(1);

        emit Transfer(address(0), to, nftId);

        super._mintNonFungible(to, nftId, data, batch, safe);
    }

/////////////////////////////////////////// Receiver Internal Functions ///////////////////////////////////////

    /**
     * @dev Internal function to invoke {IERC721Receiver-onERC721Received} on a target address.
     * The call is not executed if the target address is not a contract.
     *
     * @param from address representing the previous owner of the given token ID
     * @param to target address that will receive the tokens
     * @param nftId uint256 identifiers to be transferred
     * @param data bytes optional data to send along with the call
     * @param safe bool whether it is part of a safe transfer
     */
    function _callOnERC721Received(
        address from,
        address to,
        uint256 nftId,
        bytes memory data,
        bool safe
    ) internal
    {
        if (!to.isContract()) {
            return;
        }

        if (_isERC1155TokenReceiver(to)) {
            _callOnERC1155Received(from, to, nftId, 1, data);
        } else {
            if (safe) {
                (bool success, bytes memory returndata) = to.call(abi.encodeWithSelector(
                    IERC721Receiver(to).onERC721Received.selector,
                    _msgSender(),
                    from,
                    nftId,
                    data
                ));

                _checkReceiverCallReturnValues(success, returndata, ERC721_RECEIVED);
            }
        }
    }

    /**
     * @dev internal function to tell whether a contract implements ERC1155TokenReceiver interface
     * @param _contract address query contract address
     * @return whether the given contract is an ERC1155 Receiver contract
     */
    function _isERC1155TokenReceiver(address _contract) internal view returns(bool) {
        bool success;
        uint256 result;
        // solium-disable-next-line security/no-inline-assembly
        assembly {
            let x:= mload(0x40)                                     // Find empty storage location using "free memory pointer"
            mstore(x, ERC165_InterfaceId)                           // Place signature at beginning of empty storage
            mstore(add(x, 0x04), ERC1155TokenReceiver_InterfaceId)  // Place first argument directly next to signature

            success:= staticcall(
                10000,         // 10k gas
                _contract,     // To addr
                x,             // Inputs are stored at location x
                0x24,          // Inputs are 36 bytes long
                x,             // Store output over input (saves space)
                0x20)          // Outputs are 32 bytes long

            result:= mload(x)                 // Load the result
        }
        // (10000 / 63) "not enough for supportsInterface(...)"
        // consume all gas, so caller can potentially know that there was not enough gas
        assert(gasleft() > 158);
        return success && result == 1;
    }
}

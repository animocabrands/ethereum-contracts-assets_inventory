// SPDX-License-Identifier: MIT

pragma solidity 0.6.8;

import "./../ERC721/IERC721.sol";
import "./../ERC721/IERC721Exists.sol";
import "./../ERC721/IERC721Metadata.sol";
import "./../ERC721/IERC721Receiver.sol";
import "./../ERC1155/ERC1155Inventory.sol";

// import "./../ERC1155/IERC1155TokenReceiver.sol";

/**
 * @title ERC1155721Inventory, an ERC1155Inventory with additional support for ERC721.
 */
abstract contract ERC1155721Inventory is IERC721, IERC721Exists, IERC721Metadata, ERC1155Inventory {
    using SafeMath for uint256;
    using Address for address;

    //bytes4(keccak256("supportsInterface(byte4)"))
    bytes4 internal constant _INTERFACE_ID_ERC165 = 0x01ffc9a7;
    bytes4 internal constant _INTERFACE_ID_ERC1155TokenReceiver = type(IERC1155TokenReceiver).interfaceId;

    bytes4 internal constant _ERC721_RECEIVED = type(IERC721Receiver).interfaceId;

    uint256 internal constant _APPROVAL_BIT_TOKEN_OWNER_ = 1 << 160;

    mapping(address => uint256) internal _nftBalances;
    mapping(uint256 => address) internal _nftApprovals;

    constructor() internal ERC1155Inventory() {
        _registerInterface(type(IERC721).interfaceId);
        _registerInterface(type(IERC721Exists).interfaceId);
        _registerInterface(type(IERC721Metadata).interfaceId);
    }

    //===================================== ERC721 ==========================================/

    function balanceOf(address tokenOwner) public virtual override view returns (uint256) {
        require(tokenOwner != address(0), "Inventory: zero address");
        return _nftBalances[tokenOwner];
    }

    function ownerOf(uint256 nftId) public virtual override(IERC721, ERC1155Inventory) view returns (address) {
        return ERC1155Inventory.ownerOf(nftId);
    }

    function approve(address to, uint256 nftId) public virtual override {
        address tokenOwner = address(ownerOf(nftId));
        require(to != tokenOwner, "Inventory: self-approval");

        address sender = _msgSender();
        require((sender == tokenOwner) || _operators[tokenOwner][sender], "Inventory: non-approved sender");
        _owners[nftId] = uint256(tokenOwner) | _APPROVAL_BIT_TOKEN_OWNER_;
        _nftApprovals[nftId] = to;
        emit Approval(tokenOwner, to, nftId);
    }

    function getApproved(uint256 nftId) public virtual override view returns (address) {
        uint256 tokenOwner = _owners[nftId];
        require(isNFT(nftId) && (address(tokenOwner) != address(0)), "Inventory: non-existing NFT");
        if (tokenOwner & _APPROVAL_BIT_TOKEN_OWNER_ != 0) {
            return _nftApprovals[nftId];
        } else {
            return address(0);
        }
    }

    function isApprovedForAll(address tokenOwner, address operator)
        public
        virtual
        override(IERC721, ERC1155Inventory)
        view
        returns (bool)
    {
        return ERC1155Inventory.isApprovedForAll(tokenOwner, operator);
    }

    function setApprovalForAll(address operator, bool approved) public virtual override(IERC721, ERC1155Inventory) {
        return ERC1155Inventory.setApprovalForAll(operator, approved);
    }


    function transferFrom(address from, address to, uint256 nftId) public virtual override {
        require(isNFT(nftId), "Inventory: not an NFT");
        _transferFrom(from, to, nftId, 1, "", false, false, _UNUSED_BOOL);
    }

    function safeTransferFrom(address from, address to, uint256 nftId) public virtual override {
        require(isNFT(nftId), "Inventory: not an NFT");
        _transferFrom(from, to, nftId, 1, "", false, true, _UNUSED_BOOL);
    }

    function safeTransferFrom(address from, address to, uint256 nftId, bytes memory data) public virtual override {
        require(isNFT(nftId), "Inventory: not an NFT");
        _transferFrom(from, to, nftId, 1, data, false, true, _UNUSED_BOOL);
    }

    function tokenURI(uint256 nftId) external virtual override view returns (string memory) {
        require(exists(nftId), "Inventory: non-existing NFT");
        return _uri(nftId);
    }

    function exists(uint256 nftId) public override view returns (bool) {
        return address(_owners[nftId]) != address(0);
    }

    //================================== Minting Internal Functions =======================================/

    function _mintNonFungible(
        address to,
        uint256 id,
        uint256 value,
        bool isSameNFTCollectionOperation,
        bool isBatchOperation
    ) internal virtual override {
        require(value == 1, "Inventory: wrong NFT value");
        require(_owners[id] == 0, "Inventory: existing/burnt NFT");

        _owners[id] = uint256(to);

        if (!isSameNFTCollectionOperation) {
            uint256 collectionId = id & _NF_COLLECTION_MASK;
            // it is virtually impossible that a non-fungible collection supply
            // overflows due to the cost of minting individual tokens
            _supplies[collectionId] += 1;
            // cannot overflow as supply cannot overflow
            _balances[collectionId][to] += 1;

            if (!isBatchOperation) {
                // cannot overflow
                _nftBalances[to] += 1;
            }
        }
    }

    /**
     * Mints some token.
     * @dev Reverts if `isBatch` is false and `to` is the zero address.
     * @dev Reverts if `id` represents a non-fungible collection.
     * @dev Reverts if `id` represents a non-fungible token and `value` is not 1.
     * @dev Reverts if `id` represents a non-fungible token which is owned by a non-zero address.
     * @dev Reverts if `id` represents a fungible collection and `value` is 0.
     * @dev Reverts if `id` represents a fungible collection and there is an overflow of supply.
     * @dev Reverts if `isBatch` is false, `safe` is true and the call to the receiver contract fails or is refused.
     * @dev Emits an {IERC1155-TransferSingle} event if `isBatch` is false.
     * @param to Address of the new token owner.
     * @param id Identifier of the token to mint.
     * @param value Amount of token to mint.
     * @param data Optional data to send along to a receiver contract.
     * @param safe Whether to call the receiver contract.
     * @param isBatch Whether this function is called by `_batchMint`.
     */
    function _mint(
        address to,
        uint256 id,
        uint256 value,
        bytes memory data,
        bool safe,
        bool isBatch
    ) internal virtual override {
        if (!isBatch) {
            require(to != address(0), "Inventory: transfer to zero");
        }
        address sender = _msgSender();
        if (isFungible(id)) {
            _mintFungible(to, id, value);
        } else if (id & _NF_TOKEN_MASK != 0) {
            _mintNonFungible(to, id, value, false, isBatch);
            emit Transfer(address(0), to, id);
        } else {
            revert("Inventory: not a token id");
        }

        if (!isBatch) {
            emit TransferSingle(sender, address(0), to, id, value);

            if (safe && to.isContract()) {
                if (_isERC1155TokenReceiver(to)) {
                    _callOnERC1155Received(address(0), to, id, value, data);
                } else {
                    _callOnERC721Received(address(0), to, id, data);
                }
            }
        }
    }

    /**
     * Mints a batch of tokens.
     * @dev Reverts if `ids` and `values` have different lengths.
     * @dev Reverts if `to` is the zero address.
     * @dev Reverts if one of `ids` represents a non-fungible collection.
     * @dev Reverts if one of `ids` represents a non-fungible token and its paired value is not 1.
     * @dev Reverts if one of `ids` represents a non-fungible token which is owned by a non-zero address.
     * @dev Reverts if one of `ids` represents a fungible collection and its paired value is 0.
     * @dev Reverts if one of `ids` represents a fungible collection and there is an overflow of supply.
     * @dev Reverts if `safe` is true and the call to the receiver contract fails or is refused.
     * @dev Emits an {IERC1155-TransferBatch} event.
     * @param to Address of the new tokens owner.
     * @param ids Identifiers of the tokens to mint.
     * @param values Amounts of tokens to mint.
     * @param data Optional data to send along to a receiver contract.
     * @param safe Whether to call the receiver contract.
     */
    function _batchMint(
        address to,
        uint256[] memory ids,
        uint256[] memory values,
        bytes memory data,
        bool safe
    ) internal virtual override {
        require(to != address(0), "Inventory: transfer to zero");
        uint256 length = ids.length;
        require(length == values.length, "Inventory: inconsistent arrays");

        uint256 mintedNFTs = 0;
        for (uint256 i = 0; i < length; i++) {
            uint256 id = ids[i];
            _mint(to, id, values[i], data, safe, true);
            if (isNFT(id)) {
                mintedNFTs += 1;
            }
        }

        if (mintedNFTs != 0) {
            // cannot overflow
            _nftBalances[to] += mintedNFTs;
        }

        emit TransferBatch(_msgSender(), address(0), to, ids, values);
        if (safe && to.isContract()) {
            _callOnERC1155BatchReceived(address(0), to, ids, values, data);
        }
    }

    /**
     * Mints a batch of non-fungible tokens belonging to the same collection.
     * @dev Reverts if `to` is the zero address.
     * @dev Reverts if one of `nftIds` does not represent a non-fungible token.
     * @dev Reverts if one of `nftIds` represents a non-fungible token which is owned by a non-zero address.
     * @dev Reverts if two of `nftIds` have a different collection.
     * @dev Reverts if `safe` is true and the call to the receiver contract fails or is refused.
     * @dev Emits an {IERC1155-TransferBatch} event.
     * @param to Address of the new tokens owner.
     * @param nftIds Identifiers of the tokens to mint.
     * @param data Optional data to send along to a receiver contract.
     * @param safe Whether to call the receiver contract.
     */
    function _sameNFTCollectionBatchMint(
        address to,
        uint256[] memory nftIds,
        bytes memory data,
        bool safe
    ) internal virtual override {
        require(to != address(0), "Inventory: transfer to zero");
        uint256 length = nftIds.length;
        uint256[] memory values = new uint256[](length);
        address sender = _msgSender();

        uint256 collectionId;
        for (uint256 i = 0; i < length; i++) {
            uint256 nftId = nftIds[i];
            if (i == 0) {
                collectionId = nftId & _NF_COLLECTION_MASK;
            } else {
                require(collectionId == nftId & _NF_COLLECTION_MASK, "Inventory: not same collection");
            }
            values[i] = 1;
            _mintNonFungible(to, nftId, 1, true, true);
            emit Transfer(address(0), to, nftId);
        }

        // it is virtually impossible that a non-fungible collection supply (and therefore balance)
        // overflows due to the cost of minting unique tokens
        _supplies[collectionId] += length;
        _balances[collectionId][to] += length;
        _nftBalances[to] += length;

        emit TransferBatch(sender, address(0), to, nftIds, values);
        if (safe && to.isContract()) {
            _callOnERC1155BatchReceived(address(0), to, nftIds, values, data);
        }
    }

    //============================== Transfer Internal Functions =======================================/

    function _transferNonFungible(
        address from,
        address to,
        uint256 id,
        uint256 value,
        bool isSameNFTCollectionOperation,
        bool isBatchOperation,
        bool operatable
    ) internal virtual override {
        require(value == 1, "Inventory: wrong NFT value");
        uint256 owner = _owners[id];
        require(from == address(owner), "Inventory: non-owned NFT");
        if (!operatable) {
            require(
                (owner & _APPROVAL_BIT_TOKEN_OWNER_ != 0) && _msgSender() == _nftApprovals[id],
                "Inventory: non-approved sender"
            );
        }
        _owners[id] = uint256(to);
        if (!isSameNFTCollectionOperation) {
            uint256 collectionId = id & _NF_COLLECTION_MASK;
            // cannot underflow as balance is verified through ownership
            _balances[collectionId][from] -= 1;
            // cannot overflow as supply cannot overflow
            _balances[collectionId][to] += 1;

            if (!isBatchOperation) {
                // Cannot underflow, balance confirmed through ownership
                _nftBalances[from] -= 1;
                // Cannot overflow
                _nftBalances[to] += 1;
            }
        }
    }

    /**
     * Transfers tokens to another address.
     * @dev Reverts if `isBatch` is false and `to` is the zero address.
     * @dev Reverts if `isBatch` is false the sender is not approved.
     * @dev Reverts if `id` represents a non-fungible collection.
     * @dev Reverts if `id` represents a non-fungible token and `value` is not 1.
     * @dev Reverts if `id` represents a non-fungible token and is not owned by `from`.
     * @dev Reverts if `id` represents a fungible collection and `value` is 0.
     * @dev Reverts if `id` represents a fungible collection and `from` doesn't have enough balance.
     * @dev Emits an {IERC1155-TransferSingle} event.
     * @param from Current token owner.
     * @param to Address of the new token owner.
     * @param id Identifier of the token to transfer.
     * @param value Amount of token to transfer.
     * @param data Optional data to pass to the receiver contract.
     * @param isBatch Whether this function is called by `_safeBatchTransferFrom`.
     * @param safe Whether this is a safe transfer.
     * @param operatable Whether the sender has an operator-level approval.
     */
    function _transferFrom(
        address from,
        address to,
        uint256 id,
        uint256 value,
        bytes memory data,
        bool isBatch,
        bool safe,
        bool operatable
    ) internal virtual override {
        address sender = _msgSender();
        if (!isBatch) {
            require(to != address(0), "Inventory: transfer to zero");
            operatable = _isOperatable(from, sender);
        }

        if (isFungible(id)) {
            require(operatable, "Inventory: non-approved sender");
            _transferFungible(from, to, id, value);
        } else if (id & _NF_TOKEN_MASK != 0) {
            _transferNonFungible(from, to, id, value, false, isBatch, operatable);
            emit Transfer(from, to, id);
        } else {
            revert("Inventory: not a token id");
        }

        if (!isBatch) {
            emit TransferSingle(sender, from, to, id, value);
            if (safe && to.isContract()) {
                if (_isERC1155TokenReceiver(to)) {
                    _callOnERC1155Received(from, to, id, value, data);
                } else {
                    _callOnERC721Received(from, to, id, data);
                }
            }
        }
    }

    /**
     * Transfers multiple tokens to another address
     * @dev Reverts if `ids` and `values` have inconsistent lengths.
     * @dev Reverts if `to` is the zero address.
     * @dev Reverts if the sender is not approved.
     * @dev Reverts if one of `ids` represents a non-fungible collection.
     * @dev Reverts if one of `ids` represents a non-fungible token and `value` is not 1.
     * @dev Reverts if one of `ids` represents a non-fungible token and is not owned by `from`.
     * @dev Reverts if one of `ids` represents a fungible collection and `value` is 0.
     * @dev Reverts if one of `ids` represents a fungible collection and `from` doesn't have enough balance.
     * @dev Emits an {IERC1155-TransferBatch} event.
     * @param from Current token owner.
     * @param to Address of the new token owner.
     * @param ids Identifiers of the tokens to transfer.
     * @param values Amounts of tokens to transfer.
     * @param data Optional data to pass to the receiver contract.
     */
    function _safeBatchTransferFrom(
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory values,
        bytes memory data
    ) internal virtual override {
        require(to != address(0), "Inventory: transfer to zero");
        uint256 length = ids.length;
        require(length == values.length, "Inventory: inconsistent arrays");
        address sender = _msgSender();
        bool operatable = _isOperatable(from, sender);

        uint256 transferredNFTs = 0;
        for (uint256 i = 0; i < length; i++) {
            uint256 id = ids[i];
            _transferFrom(from, to, id, values[i], data, true, true, operatable);
            if (isNFT(id)) {
                transferredNFTs++;
            }
        }

        if (transferredNFTs != 0) {
            // cannot underflow as balance is verified through ownership
            _nftBalances[from] -= transferredNFTs;
            // cannot overflow
            _nftBalances[to] += transferredNFTs;
        }

        emit TransferBatch(_msgSender(), from, to, ids, values);
        if (to.isContract()) {
            _callOnERC1155BatchReceived(from, to, ids, values, data);
        }
    }

    /**
     * @dev Transfers multiple non-fungible tokens belonging to the same collection.
     * @dev Reverts if `to` is the zero address.
     * @dev Reverts if one of `nftIds` does not represent a non-fungible token.
     * @dev Reverts if one of `nftIds` represents a non-fungible token which is not owned by `from`.
     * @dev Reverts if two of `nftIds` have a different collection.
     * @dev Emits an {IERC1155-TransferBatch} event.
     * @param to Address of the new tokens owner.
     * @param nftIds Identifiers of the non-fungible tokens to mint.
     * @param data Optional data to send along to a receiver contract.
     */
    function _sameNFTCollectionSafeBatchTransferFrom(
        address from,
        address to,
        uint256[] memory nftIds,
        bytes memory data
    ) internal virtual override {
        require(to != address(0), "Inventory: transfer to zero");
        address sender = _msgSender();
        bool operatable = _isOperatable(from, sender);

        uint256 length = nftIds.length;
        uint256[] memory values = new uint256[](length);

        uint256 collectionId;
        for (uint256 i = 0; i < length; i++) {
            uint256 nftId = nftIds[i];
            if (i == 0) {
                collectionId = nftId & _NF_COLLECTION_MASK;
            } else {
                require(collectionId == nftId & _NF_COLLECTION_MASK, "Inventory: not same collection");
            }
            values[i] = 1;
            _transferNonFungible(from, to, nftId, 1, true, true, operatable);
            emit Transfer(from, to, nftId);
        }

        // cannot underflow as balance is verified through ownership
        _balances[collectionId][from] -= length;
        // cannot overflow as supply cannot overflow
        _balances[collectionId][to] += length;

        // cannot underflow as balance is verified through ownership
        _nftBalances[from] -= length;
        // cannot overflow
        _nftBalances[to] += length;

        emit TransferBatch(sender, from, to, nftIds, values);
        if (to.isContract()) {
            _callOnERC1155BatchReceived(sender, to, nftIds, values, data);
        }
    }

    //================================ Burning Internal Functions ======================================/

    function _burnNonFungible(
        address from,
        uint256 id,
        uint256 value,
        bool isSameNFTCollectionOperation,
        bool isBatchOperation,
        bool operatable
    ) internal virtual override {
        require(value == 1, "Inventory: wrong NFT value");
        uint256 owner = _owners[id];
        require(from == address(owner), "Inventory: non-owned NFT");
        if (!operatable) {
            require(
                (owner & _APPROVAL_BIT_TOKEN_OWNER_ != 0) && _msgSender() == _nftApprovals[id],
                "Inventory: non-approved sender"
            );
        }
        _owners[id] = _BURNT_NFT_OWNER;

        if (!isSameNFTCollectionOperation) {
            uint256 collectionId = id & _NF_COLLECTION_MASK;
            // cannot underflow as balance is confirmed through ownership
            _balances[collectionId][from] -= 1;
            // Cannot underflow
            _supplies[collectionId] -= 1;

            if (!isBatchOperation) {
                // Cannot underflow
                _nftBalances[from] -= 1;
            }
        }
    }

    /**
     * Burns some token.
     * @dev Reverts if `isBatch` is false and the sender is not approved.
     * @dev Reverts if `id` represents a non-fungible collection.
     * @dev Reverts if `id` represents a fungible collection and `value` is 0.
     * @dev Reverts if `id` represents a fungible collection and `value` is higher than `from`'s balance.
     * @dev Reverts if `id` represents a non-fungible token and `value` is not 1.
     * @dev Reverts if `id` represents a non-fungible token which is not owned by `from`.
     * @dev Emits an {IERC1155-TransferSingle} event if `isBatch` is false.
     * @param from Address of the current token owner.
     * @param id Identifier of the token to burn.
     * @param value Amount of token to burn.
     * @param isBatch Whether this function is called by `_batchBurnFrom`.
     */
    function _burnFrom(
        address from,
        uint256 id,
        uint256 value,
        bool isBatch,
        bool operatable
    ) internal virtual override {
        address sender = _msgSender();
        if (!isBatch) {
            operatable = _isOperatable(from, sender);
        }

        if (isFungible(id)) {
            _burnFungible(from, id, value);
            require(operatable, "Inventory: non-approved sender");
        } else if (id & _NF_TOKEN_MASK != 0) {
            _burnNonFungible(from, id, value, false, isBatch, operatable);
            emit Transfer(from, address(0), id);
        } else {
            revert("Inventory: not a token id");
        }

        if (!isBatch) {
            emit TransferSingle(sender, from, address(0), id, value);
        }
    }

    /**
     * Burns multiple tokens.
     * @dev Reverts if `ids` and `values` have different lengths.
     * @dev Reverts if the sender is not approved.
     * @dev Reverts if one of `ids` represents a non-fungible collection.
     * @dev Reverts if one of `ids` represents a fungible collection and `value` is 0.
     * @dev Reverts if one of `ids` represents a fungible collection and `value` is higher than `from`'s balance.
     * @dev Reverts if one of `ids` represents a non-fungible token and `value` is not 1.
     * @dev Reverts if one of `ids` represents a non-fungible token which is not owned by `from`.
     * @dev Emits an {IERC1155-TransferBatch} event.
     * @param from Address of the current tokens owner.
     * @param ids Identifiers of the tokens to burn.
     * @param values Amounts of tokens to burn.
     */
    function _batchBurnFrom(
        address from,
        uint256[] memory ids,
        uint256[] memory values
    ) internal virtual override {
        uint256 length = ids.length;
        require(length == values.length, "Inventory: inconsistent arrays");

        address sender = _msgSender();
        bool operatable = _isOperatable(from, sender);

        uint256 burntNFTs = 0;
        for (uint256 i = 0; i < length; ++i) {
            uint256 id = ids[i];
            _burnFrom(from, id, values[i], true, operatable);
            if (isNFT(id)) {
                burntNFTs++;
            }
        }

        if (burntNFTs != 0) {
            _nftBalances[from] -= burntNFTs;
        }

        emit TransferBatch(sender, from, address(0), ids, values);
    }

    /**
     * Burns multiple non-fungible tokens belonging to the same collection.
     * @dev Reverts if the sender is not approved.
     * @dev Reverts if one of `nftIds` does not represent a non-fungible token.
     * @dev Reverts if one of `nftIds` is not owned by `from`.
     * @dev Reverts if there are different collections for `nftIds`.
     * @dev Emits an {IERC1155-TransferBatch} event.
     * @param from address address that will own the minted tokens
     * @param nftIds uint256[] identifiers of the tokens to be minted
     */
    function _sameNFTCollectionBatchBurnFrom(address from, uint256[] memory nftIds) internal virtual override {
        address sender = _msgSender();
        bool operatable = _isOperatable(from, sender);

        uint256 length = nftIds.length;
        uint256[] memory values = new uint256[](length);

        uint256 collectionId;
        for (uint256 i = 0; i < length; i++) {
            uint256 nftId = nftIds[i];
            if (i == 0) {
                collectionId = nftId & _NF_COLLECTION_MASK;
            } else {
                require(collectionId == nftId & _NF_COLLECTION_MASK, "Inventory: not same collection");
            }
            values[i] = 1;
            _burnNonFungible(from, nftId, 1, true, true, operatable);
            emit Transfer(from, address(0), nftId);
        }

        // cannot underflow as balance is confirmed through ownership
        _balances[collectionId][from] -= length;
        // cannot underflow
        _supplies[collectionId] -= length;
        // cannot underflow
        _nftBalances[from] -= length;

        emit TransferBatch(sender, from, address(0), nftIds, values);
    }

    ///////////////////////////////////// Receiver Calls Internal /////////////////////////////////////

    /**
     * @dev Internal function to invoke {IERC721Receiver-onERC721Received} on a target address.
     * The call is not executed if the target address is not a contract.
     *
     * @param from address representing the previous owner of the given token ID
     * @param to target address that will receive the tokens
     * @param nftId uint256 identifiers to be transferred
     * @param data bytes optional data to send along with the call
     */
    function _callOnERC721Received(
        address from,
        address to,
        uint256 nftId,
        bytes memory data
    ) internal {
        require(
            IERC721Receiver(to).onERC721Received(_msgSender(), from, nftId, data) == _ERC721_RECEIVED,
            "Inventory: transfer refused"
        );
    }

    /**
     * @dev internal function to tell whether a contract is an ERC1155 Receiver contract
     * @param _contract address query contract addrss
     * @return wheter the given contract is an ERC1155 Receiver contract
     */
    function _isERC1155TokenReceiver(address _contract) internal view returns (bool) {
        bool success;
        bool result;
        bytes memory call_data = abi.encodeWithSelector(_INTERFACE_ID_ERC165, _INTERFACE_ID_ERC1155TokenReceiver);
        assembly {
            let call_ptr := add(0x20, call_data)
            let call_size := mload(call_data)
            let output := mload(0x40) // Find empty storage location using "free memory pointer"
            mstore(output, 0x0)
            success := staticcall(10000, _contract, call_ptr, call_size, output, 0x20) // 32 bytes
            result := mload(output)
        }
        // (10000 / 63) "not enough for supportsInterface(...)" // consume all gas, so caller can potentially know that there was not enough gas
        assert(gasleft() > 158);
        return success && result;
    }
}

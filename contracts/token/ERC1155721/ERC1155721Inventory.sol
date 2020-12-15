// SPDX-License-Identifier: MIT

pragma solidity 0.6.8;

import "@openzeppelin/contracts/utils/Address.sol";
import "./../ERC721/IERC721.sol";
import "./../ERC721/IERC721Metadata.sol";
import "./../ERC721/IERC721Receiver.sol";
import "./../ERC1155/ERC1155InventoryBase.sol";

/**
 * @title ERC1155721Inventory, an ERC1155Inventory with additional support for ERC721.
 */
abstract contract ERC1155721Inventory is IERC721, IERC721Metadata, ERC1155InventoryBase {
    using Address for address;

    //bytes4(keccak256("supportsInterface(byte4)"))
    bytes4 internal constant _INTERFACE_ID_ERC165 = 0x01ffc9a7;
    bytes4 internal constant _INTERFACE_ID_ERC1155TokenReceiver = type(IERC1155TokenReceiver).interfaceId;

    bytes4 internal constant _ERC721_RECEIVED = type(IERC721Receiver).interfaceId;

    uint256 internal constant _APPROVAL_BIT_TOKEN_OWNER_ = 1 << 160;

    /* owner => NFT balance */
    mapping(address => uint256) internal _nftBalances;

    /* NFT ID => operator */
    mapping(uint256 => address) internal _nftApprovals;

    constructor() internal ERC1155InventoryBase() {
        _registerInterface(type(IERC721).interfaceId);
        _registerInterface(type(IERC721Metadata).interfaceId);
    }

    //================================== ERC1155 =======================================/

    /**
     * @dev See {IERC1155-safeTransferFrom}.
     */
    function safeTransferFrom(
        address from,
        address to,
        uint256 id,
        uint256 value,
        bytes memory data
    ) public virtual override {
        _safeTransferFrom(from, to, id, value, data);
    }

    /**
     * @dev See {IERC1155-safeBatchTransferFrom}.
     */
    function safeBatchTransferFrom(
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory values,
        bytes memory data
    ) public virtual override {
        _safeBatchTransferFrom(from, to, ids, values, data);
    }

    //===================================== ERC721 ==========================================/

    /**
     * @dev See {IERC721-balanceOf(address)}.
     */
    function balanceOf(address tokenOwner) public virtual override view returns (uint256) {
        require(tokenOwner != address(0), "Inventory: zero address");
        return _nftBalances[tokenOwner];
    }

    /**
     * @dev See {IERC721-ownerOf(uint256)}.
     */
    function ownerOf(uint256 nftId) public virtual override(IERC721, ERC1155InventoryBase) view returns (address) {
        return ERC1155InventoryBase.ownerOf(nftId);
    }

    /**
     * @dev See {IERC721-approve(address,uint256)}.
     */
    function approve(address to, uint256 nftId) public virtual override {
        address tokenOwner = address(ownerOf(nftId));
        require(to != tokenOwner, "Inventory: self-approval");

        address sender = _msgSender();
        require((sender == tokenOwner) || _operators[tokenOwner][sender], "Inventory: non-approved sender");
        _owners[nftId] = uint256(tokenOwner) | _APPROVAL_BIT_TOKEN_OWNER_;
        _nftApprovals[nftId] = to;
        emit Approval(tokenOwner, to, nftId);
    }

    /**
     * @dev See {IERC721-getApproved(uint256)}.
     */
    function getApproved(uint256 nftId) public virtual override view returns (address) {
        uint256 tokenOwner = _owners[nftId];
        require(isNFT(nftId) && (address(tokenOwner) != address(0)), "Inventory: non-existing NFT");
        if (tokenOwner & _APPROVAL_BIT_TOKEN_OWNER_ != 0) {
            return _nftApprovals[nftId];
        } else {
            return address(0);
        }
    }

    /**
     * @dev See {IERC721-isApprovedForAll(address,address)}.
     */
    function isApprovedForAll(address tokenOwner, address operator)
        public
        virtual
        override(IERC721, ERC1155InventoryBase)
        view
        returns (bool)
    {
        return ERC1155InventoryBase.isApprovedForAll(tokenOwner, operator);
    }

    /**
     * @dev See {IERC721-isApprovedForAll(address,address)} / {IERC1155-isApprovedForAll(address,address)}
     */
    function setApprovalForAll(address operator, bool approved) public virtual override(IERC721, ERC1155InventoryBase) {
        return ERC1155InventoryBase.setApprovalForAll(operator, approved);
    }

    /**
     * @dev See {IERC721-transferFrom(address,address,uint256)}.
     */
    function transferFrom(address from, address to, uint256 nftId) public virtual override {
        _transferFrom_ERC721(from, to, nftId, "", /* safe */false);
    }

    /**
     * @dev See {IERC721-safeTransferFrom(address,address,uint256)}.
     */
    function safeTransferFrom(address from, address to, uint256 nftId) public virtual override {
        _transferFrom_ERC721(from, to, nftId, "", /* safe */true);
    }

    /**
     * @dev See {IERC721-safeTransferFrom(address,address,uint256,bytes)}.
     */
    function safeTransferFrom(address from, address to, uint256 nftId, bytes memory data) public virtual override {
        _transferFrom_ERC721(from, to, nftId, data, /* safe */true);
    }

    /**
     * @dev See {IERC721-tokenURI(uint256)}.
     */
    function tokenURI(uint256 nftId) external virtual override view returns (string memory) {
        require(address(_owners[nftId]) != address(0), "Inventory: non-existing NFT");
        return _uri(nftId);
    }

    //================================== Minting Core Internal Helpers =======================================/

    function _mintFungible(
        address to,
        uint256 id,
        uint256 value
    ) internal {
        require(value != 0, "Inventory: zero value");
        uint256 supply = _supplies[id];
        uint256 newSupply = supply + value;
        require(newSupply > supply, "Inventory: supply overflow");
        _supplies[id] = newSupply;
        // cannot overflow as supply cannot overflow
        _balances[id][to] += value;
    }

    function _mintNFT(
        address to,
        uint256 id,
        uint256 value,
        bool isBatch
    ) internal {
        require(value == 1, "Inventory: wrong NFT value");
        require(_owners[id] == 0, "Inventory: existing/burnt NFT");

        _owners[id] = uint256(to);

        if (!isBatch) {
            uint256 collectionId = id & _NF_COLLECTION_MASK;
            // it is virtually impossible that a non-fungible collection supply
            // overflows due to the cost of minting individual tokens
            ++_supplies[collectionId];
            ++_balances[collectionId][to];
            ++_nftBalances[to];
        }
    }

    //================================== Minting Internal Functions =======================================/

    /**
     * Mints an NFT using ERC721 logic.
     * @dev Reverts if `to` is the zero address.
     * @dev Reverts if `id` does not represent a non-fungible token.
     * @dev Reverts if `safe` is true, the receiver is a contract and the receiver call fails or is refused.
     * @dev Emits an {IERC721-Transfer} event.
     * @dev Emits an {IERC1155-TransferSingle} event.
     * @param to Address of the new token owner.
     * @param nftId Identifier of the token to transfer.
     * @param data Optional data to pass to the receiver contract.
     * @param safe Whether this is a safe transfer.
     */
    function _mint_ERC721(
        address to,
        uint256 nftId,
        bytes memory data,
        bool safe
    ) internal {
        require(to != address(0), "Inventory: transfer to zero");
        require(isNFT(nftId), "Inventory: not an NFT");

        _mintNFT(to, nftId, 1, false);

        emit Transfer(address(0), to, nftId);
        emit TransferSingle(_msgSender(), address(0), to, nftId, 1);
        if (to.isContract()) {
            if (_isERC1155TokenReceiver(to)) {
                _callOnERC1155Received(address(0), to, nftId, 1, data);
            } else if (safe) {
                _callOnERC721Received(address(0), to, nftId, data);
            }
        }
    }

    /**
     * Unsafely mints a batch of NFTs using ERC721 logic.
     * @dev Reverts if `to` is the zero address.
     * @dev Reverts if any of `nftIds` do not represent a non-fungible token.
     * @dev Emits up to several {IERC721-Transfer} events.
     * @dev Emits an {IERC1155-TransferBatch} event.
     * @param to Address of the new token owner.
     * @param nftIds Identifiers of the tokens to transfer.
     */
    function _batchMint_ERC721(
        address to,
        uint256[] memory nftIds
    ) internal {
        require(to != address(0), "Inventory: transfer to zero");

        uint256 length = nftIds.length;
        uint256[] memory values = new uint256[](length);

        uint256 nfCollectionId;
        uint256 nfCollectionCount;
        for (uint256 i; i != length; ++i) {
            uint256 nftId = nftIds[i];
            require(isNFT(nftId), "Inventory: not an NFT");
            values[i] = 1;
            _mintNFT(to, nftId, 1, true);
            emit Transfer(address(0), to, nftId);
            uint256 nextCollectionId = nftId & _NF_COLLECTION_MASK;
            if (nfCollectionId == 0) {
                nfCollectionId = nextCollectionId;
                nfCollectionCount = 1;
            } else {
                if (nextCollectionId != nfCollectionId) {
                    _balances[nfCollectionId][to] += nfCollectionCount;
                    _supplies[nfCollectionId] += nfCollectionCount;
                    nfCollectionId = nextCollectionId;
                    nfCollectionCount = 1;
                } else {
                    ++nfCollectionCount;
                }
            }
        }

        _balances[nfCollectionId][to] += nfCollectionCount;
        _supplies[nfCollectionId] += nfCollectionCount;
        _nftBalances[to] += length;

        emit TransferBatch(_msgSender(), address(0), to, nftIds, values);
        if (to.isContract() && _isERC1155TokenReceiver(to)) {
            _callOnERC1155BatchReceived(address(0), to, nftIds, values, "");
        }
    }

    /**
     * Mints some token.
     * @dev Reverts if `to` is the zero address.
     * @dev Reverts if `id` represents a non-fungible collection.
     * @dev Reverts if `id` represents a non-fungible token and `value` is not 1.
     * @dev Reverts if `id` represents a non-fungible token which is owned by a non-zero address.
     * @dev Reverts if `id` represents a fungible collection and `value` is 0.
     * @dev Reverts if `id` represents a fungible collection and there is an overflow of supply.
     * @dev Emits an {IERC1155-TransferSingle} event.
     * @dev Emits an {IERC721-Transfer} event if `id` represents a non-fungible token.
     * @param to Address of the new token owner.
     * @param id Identifier of the token to mint.
     * @param value Amount of token to mint.
     * @param data Optional data to send along to a receiver contract.
     */
    function _safeMint(
        address to,
        uint256 id,
        uint256 value,
        bytes memory data
    ) internal virtual {
        require(to != address(0), "Inventory: transfer to zero");
        address sender = _msgSender();
        if (isFungible(id)) {
            _mintFungible(to, id, value);
        } else if (id & _NF_TOKEN_MASK != 0) {
            _mintNFT(to, id, value, false);
            emit Transfer(address(0), to, id);
        } else {
            revert("Inventory: not a token id");
        }

        emit TransferSingle(sender, address(0), to, id, value);
        if (to.isContract()) {
            _callOnERC1155Received(address(0), to, id, value, data);
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
     * @dev Emits an {IERC1155-TransferBatch} event.
     * @dev Emits up to several {IERC721-Transfer} events for each one of `ids` that represents a non-fungible token.
     * @param to Address of the new tokens owner.
     * @param ids Identifiers of the tokens to mint.
     * @param values Amounts of tokens to mint.
     * @param data Optional data to send along to a receiver contract.
     */
    function _safeBatchMint(
        address to,
        uint256[] memory ids,
        uint256[] memory values,
        bytes memory data
    ) internal virtual {
        require(to != address(0), "Inventory: transfer to zero");
        uint256 length = ids.length;
        require(length == values.length, "Inventory: inconsistent arrays");

        uint256 nfCollectionId;
        uint256 nfCollectionCount;
        uint256 nftsCount;
        for (uint256 i; i != length; ++i) {
            uint256 id = ids[i];
            uint256 value = values[i];
            if (isFungible(id)) {
                _mintFungible(to, id, value); 
            } else if (id & _NF_TOKEN_MASK != 0) {
                _mintNFT(to, id, value, true);
                emit Transfer(address(0), to, id);
                uint256 nextCollectionId = id & _NF_COLLECTION_MASK;
                if (nfCollectionId == 0) {
                    nfCollectionId = nextCollectionId;
                    nfCollectionCount = 1;
                } else {
                    if (nextCollectionId != nfCollectionId) {
                        _balances[nfCollectionId][to] += nfCollectionCount;
                        _supplies[nfCollectionId] += nfCollectionCount;
                        nfCollectionId = nextCollectionId;
                        nftsCount += nfCollectionCount;
                        nfCollectionCount = 1;
                    } else {
                        ++nfCollectionCount;
                    }
                }
            } else {
                revert("Inventory: not a token id");
            }
        }

        if (nfCollectionId != 0) {
            _balances[nfCollectionId][to] += nfCollectionCount;
            _supplies[nfCollectionId] += nfCollectionCount;
            nftsCount += nfCollectionCount;
            _nftBalances[to] += nftsCount;
        }

        emit TransferBatch(_msgSender(), address(0), to, ids, values);
        if (to.isContract()) {
            _callOnERC1155BatchReceived(address(0), to, ids, values, data);
        }
    }

    //================================== Transfer Core Internal Helpers =======================================/

    function _transferFungible(
        address from,
        address to,
        uint256 id,
        uint256 value,
        bool operatable
    ) internal {
        require(operatable, "Inventory: non-approved sender");
        require(value != 0, "Inventory: zero value");
        uint256 balance = _balances[id][from];
        require(balance >= value, "Inventory: not enough balance");
        _balances[id][from] = balance - value;
        // cannot overflow as supply cannot overflow
        _balances[id][to] += value;
    }

    function _transferNFT(
        address from,
        address to,
        uint256 id,
        uint256 value,
        bool operatable,
        bool isBatch
    ) internal virtual {
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
        if (!isBatch) {
            transferNFTUpdateBalances(from, to, 1);
            transferNFTUpdateCollectionBalances(from, to, id & _NF_COLLECTION_MASK, 1);
        }
    }

    function transferNFTUpdateBalances(
        address from,
        address to,
        uint256 amount
    ) internal virtual {
        // cannot underflow as balance is verified through ownership
        _nftBalances[from] -= amount;
        //  cannot overflow as supply cannot overflow
        _nftBalances[to] += amount;
    }

    function transferNFTUpdateCollectionBalances(
        address from,
        address to,
        uint256 collectionId,
        uint256 amount
    ) internal virtual {
        // cannot underflow as balance is verified through ownership
        _balances[collectionId][from] -= amount;
        // cannot overflow as supply cannot overflow
        _balances[collectionId][to] += amount;
    }

    //============================== Transfer Internal Functions =======================================/

    /**
     * Transfers an NFT to another address.
     * @dev Reverts if `to` is the zero address.
     * @dev Reverts if the sender is not approved.
     * @dev Reverts if `nftId` does not represent a non-fungible token.
     * @dev Reverts if `nftId` is not owned by `from`.
     * @dev Reverts if `safe` is true, the receiver is a contract and the receiver call fails or is refused.
     * @dev Emits an {IERC721-Transfer} event.
     * @dev Emits an {IERC1155-TransferSingle} event.
     * @param from Current token owner.
     * @param to Address of the new token owner.
     * @param nftId Identifier of the token to transfer.
     * @param data Optional data to pass to the receiver contract.
     * @param safe Whether this is a safe transfer.
     */
    function _transferFrom_ERC721(
        address from,
        address to,
        uint256 nftId,
        bytes memory data,
        bool safe
    ) internal {
        require(to != address(0), "Inventory: transfer to zero");
        require(isNFT(nftId), "Inventory: not an NFT");
        address sender = _msgSender();
        bool operatable = _isOperatable(from, sender);

        _transferNFT(from, to, nftId, 1, operatable, false);

        emit Transfer(from, to, nftId);
        emit TransferSingle(sender, from, to, nftId, 1);
        if (to.isContract()) {
            if (_isERC1155TokenReceiver(to)) {
                _callOnERC1155Received(from, to, nftId, 1, data);
            } else if (safe) {
                _callOnERC721Received(from, to, nftId, data);
            }
        }
    }

    /**
     * Transfers a batch of NFTs to another address.
     * @dev Reverts if `to` is the zero address.
     * @dev Reverts if the sender is not approved.
     * @dev Reverts if one of `nftIds` does not represent a non-fungible token.
     * @dev Reverts if one of `nftIds` is not owned by `from`.
     * @dev Emits up to several {IERC721-Transfer} events.
     * @dev Emits an {IERC1155-TransferBatch} event.
     * @param from Current token owner.
     * @param to Address of the new token owner.
     * @param nftIds Identifiers of the token sto transfer.
     */
    function _batchTransferFrom_ERC721(
        address from,
        address to,
        uint256[] memory nftIds
    ) internal {
        require(to != address(0), "Inventory: transfer to zero");
        address sender = _msgSender();
        bool operatable = _isOperatable(from, sender);

        uint256 length = nftIds.length;
        uint256[] memory values = new uint256[](length);

        uint256 nfCollectionId;
        uint256 nfCollectionCount;
        for (uint256 i; i != length; ++i) {
            uint256 nftId = nftIds[i];
            require(isNFT(nftId), "Inventory: not an NFT");
            values[i] = 1;
            _transferNFT(from, to, nftId, 1, operatable, true);
            emit Transfer(from, to, nftId);
            uint256 nextCollectionId = nftId & _NF_COLLECTION_MASK;
            if (nfCollectionId == 0) {
                nfCollectionId = nextCollectionId;
                nfCollectionCount = 1;
            } else {
                if (nextCollectionId != nfCollectionId) {
                    transferNFTUpdateCollectionBalances(from, to, nextCollectionId, nfCollectionCount);
                    nfCollectionId = nextCollectionId;
                    nfCollectionCount = 1;
                } else {
                    ++nfCollectionCount;
                }
            }
        }

        transferNFTUpdateCollectionBalances(from, to, nfCollectionId, nfCollectionCount);
        transferNFTUpdateBalances(from, to, length);

        emit TransferBatch(_msgSender(), from, to, nftIds, values);
        if (to.isContract() && _isERC1155TokenReceiver(to)) {
            _callOnERC1155BatchReceived(from, to, nftIds, values, "");
        }
    }

    /**
     * Transfers tokens to another address.
     * @dev Reverts if `to` is the zero address.
     * @dev Reverts if `id` represents a non-fungible collection.
     * @dev Reverts if `id` represents a non-fungible token and `value` is not 1.
     * @dev Reverts if `id` represents a non-fungible token and is not owned by `from`.
     * @dev Reverts if `id` represents a fungible collection and `value` is 0.
     * @dev Reverts if `id` represents a fungible collection and `from` doesn't have enough balance.
     * @dev Emits an {IERC1155-TransferSingle} event.
     * @dev Emits an {IERC721-Transfer} event if `id` represents a non-fungible token.
     * @param from Current token owner.
     * @param to Address of the new token owner.
     * @param id Identifier of the token to transfer.
     * @param value Amount of token to transfer.
     * @param data Optional data to pass to the receiver contract.
     */
    function _safeTransferFrom(
        address from,
        address to,
        uint256 id,
        uint256 value,
        bytes memory data
    ) internal virtual {
        address sender = _msgSender();
        require(to != address(0), "Inventory: transfer to zero");
        bool operatable = _isOperatable(from, sender);

        if (isFungible(id)) {
            _transferFungible(from, to, id, value, operatable);
        } else if (id & _NF_TOKEN_MASK != 0) {
            _transferNFT(from, to, id, value, operatable, false);
            emit Transfer(from, to, id);
        } else {
            revert("Inventory: not a token id");
        }

        emit TransferSingle(sender, from, to, id, value);
        if (to.isContract()) {
            _callOnERC1155Received(from, to, id, value, data);
        }
    }

    /**
     * Transfers multiple tokens to another address
     * @dev Reverts if `ids` and `values` have inconsistent lengths.
     * @dev Reverts if `to` is the zero address.
     * @dev Reverts if the sender is not approved.
     * @dev Reverts if one of `ids` represents a non-fungible collection.
     * @dev Reverts if one of `ids` represents a non-fungible token and its paired `value` is not 1.
     * @dev Reverts if one of `ids` represents a non-fungible token and is not owned by `from`.
     * @dev Reverts if one of `ids` represents a fungible collection and its paired `value` is 0.
     * @dev Reverts if one of `ids` represents a fungible collection and `from` doesn't have enough balance.
     * @dev Emits an {IERC1155-TransferBatch} event.
     * @dev Emits up to several {IERC721-Transfer} events for each one of `ids` that represents a non-fungible token.
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
    ) internal virtual {
        require(to != address(0), "Inventory: transfer to zero");
        uint256 length = ids.length;
        require(length == values.length, "Inventory: inconsistent arrays");
        address sender = _msgSender();
        bool operatable = _isOperatable(from, sender);

        uint256 nfCollectionId;
        uint256 nfCollectionCount;
        uint256 nftsCount;
        for (uint256 i; i != length; ++i) {
            uint256 id = ids[i];
            if (isFungible(id)) {
                _transferFungible(from, to, id, values[i], operatable); 
            } else if (id & _NF_TOKEN_MASK != 0) {
                _transferNFT(from, to, id, values[i], operatable, true);
                emit Transfer(from, to, id);
                uint256 nextCollectionId = id & _NF_COLLECTION_MASK;
                if (nfCollectionId == 0) {
                    nfCollectionId = nextCollectionId;
                    nfCollectionCount = 1;
                } else {
                    if (nextCollectionId != nfCollectionId) {
                        transferNFTUpdateCollectionBalances(from, to, nfCollectionId, nfCollectionCount);
                        nfCollectionId = nextCollectionId;
                        nftsCount += nfCollectionCount;
                        nfCollectionCount = 1;
                    } else {
                        ++nfCollectionCount;
                    }
                }
            } else {
                revert("Inventory: not a token id");
            }
        }

        if (nfCollectionId != 0) {
            transferNFTUpdateCollectionBalances(from, to, nfCollectionId, nfCollectionCount);
            nftsCount += nfCollectionCount;
            transferNFTUpdateBalances(from, to, nftsCount);
        }

        emit TransferBatch(_msgSender(), from, to, ids, values);
        if (to.isContract()) {
            _callOnERC1155BatchReceived(from, to, ids, values, data);
        }
    }


    //================================ Burning Internal Functions ======================================/

    function _burnFungible(
        address from,
        uint256 id,
        uint256 value,
        bool operatable
    ) internal {
        require(value != 0, "Inventory: zero value");
        require(operatable, "Inventory: non-approved sender");
        uint256 balance = _balances[id][from];
        require(balance >= value, "Inventory: not enough balance");
        _balances[id][from] = balance - value;
        // Cannot underflow
        _supplies[id] -= value;
    }

    function _burnNFT(
        address from,
        uint256 id,
        uint256 value,
        bool operatable,
        bool isBatch
    ) internal virtual {
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

        if (!isBatch) {
            uint256 collectionId = id & _NF_COLLECTION_MASK;
            // cannot underflow as balance is confirmed through ownership
            --_balances[collectionId][from];
            // Cannot underflow
            --_supplies[collectionId];
            // Cannot underflow
            --_nftBalances[from];
        }
    }

    /**
     * @dev See {IERC1155721InventoryBurnable-burnFrom(address,uint256,uint256)}.
     */
    function _burnFrom(
        address from,
        uint256 id,
        uint256 value
    ) internal virtual {
        address sender = _msgSender();
        bool operatable = _isOperatable(from, sender);

        if (isFungible(id)) {
            _burnFungible(from, id, value, operatable);
        } else if (id & _NF_TOKEN_MASK != 0) {
            _burnNFT(from, id, value, operatable, false);
            emit Transfer(from, address(0), id);
        } else {
            revert("Inventory: not a token id");
        }

        emit TransferSingle(sender, from, address(0), id, value);
    }

    /**
     * Burns multiple tokens.
     * @dev Reverts if `ids` and `values` have different lengths.
     * @dev Reverts if the sender is not approved.
     * @dev Reverts if one of `ids` represents a non-fungible collection.
     * @dev Reverts if one of `ids` represents a fungible collection and `value` is 0.
     * @dev Reverts if one of `ids` represents a fungible collection and `from` doesn't have enough balance.
     * @dev Reverts if one of `ids` represents a non-fungible token and `value` is not 1.
     * @dev Reverts if one of `ids` represents a non-fungible token which is not owned by `from`.
     * @dev Emits an {IERC1155-TransferBatch} event.
     * @dev Emits up to several {IERC721-Transfer} events for each one of `ids` that represents a non-fungible token.
     * @param from Address of the current tokens owner.
     * @param ids Identifiers of the tokens to burn.
     * @param values Amounts of tokens to burn.
     */
    function _batchBurnFrom(
        address from,
        uint256[] memory ids,
        uint256[] memory values
    ) internal virtual {
        uint256 length = ids.length;
        require(length == values.length, "Inventory: inconsistent arrays");

        address sender = _msgSender();
        bool operatable = _isOperatable(from, sender);

        uint256 nfCollectionId;
        uint256 nfCollectionCount;
        uint256 nftsCount;
        for (uint256 i; i != length; ++i) {
            uint256 id = ids[i];
            if (isFungible(id)) {
                _burnFungible(from, id, values[i], operatable); 
            } else if (id & _NF_TOKEN_MASK != 0) {
                _burnNFT(from, id, values[i], operatable, true);
                emit Transfer(from, address(0), id);
                uint256 nextCollectionId = id & _NF_COLLECTION_MASK;
                if (nfCollectionId == 0) {
                    nfCollectionId = nextCollectionId;
                    nfCollectionCount = 1;
                } else {
                    if (nextCollectionId != nfCollectionId) {
                        _balances[nfCollectionId][from] -= nfCollectionCount;
                        _supplies[nfCollectionId] -= nfCollectionCount;

                        nfCollectionId = nextCollectionId;
                        nftsCount += nfCollectionCount;
                        nfCollectionCount = 1;
                    } else {
                        ++nfCollectionCount;
                    }
                }
            } else {
                revert("Inventory: not a token id");
            }
        }

        if (nfCollectionId != 0) {
            // cannot underflow as balance is verified through ownership
            _balances[nfCollectionId][from] -= nfCollectionCount;
            _supplies[nfCollectionId] -= nfCollectionCount;
            nftsCount += nfCollectionCount;
            _nftBalances[from] -= nftsCount;
        }

        emit TransferBatch(sender, from, address(0), ids, values);
    }

    ///////////////////////////////////// Receiver Calls Internal /////////////////////////////////////

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
}

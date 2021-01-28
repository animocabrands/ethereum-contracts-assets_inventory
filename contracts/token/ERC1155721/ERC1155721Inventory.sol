// SPDX-License-Identifier: MIT

pragma solidity 0.6.8;

import "@openzeppelin/contracts/utils/Address.sol";
import "./../ERC721/IERC721.sol";
import "./../ERC721/IERC721Metadata.sol";
import "./../ERC721/IERC721BatchTransfer.sol";
import "./../ERC721/IERC721Receiver.sol";
import "./../ERC1155/ERC1155InventoryBase.sol";

/**
 * @title ERC1155721Inventory, an ERC1155Inventory with additional support for ERC721.
 */
abstract contract ERC1155721Inventory is IERC721, IERC721Metadata, IERC721BatchTransfer, ERC1155InventoryBase {
    using Address for address;

    bytes4 private constant _ERC165_INTERFACE_ID = type(IERC165).interfaceId;
    bytes4 private constant _ERC1155_TOKEN_RECEIVER_INTERFACE_ID = type(IERC1155TokenReceiver).interfaceId;
    bytes4 private constant _ERC721_INTERFACE_ID = type(IERC721).interfaceId;
    bytes4 private constant _ERC721_METADATA_INTERFACE_ID = type(IERC721Metadata).interfaceId;

    bytes4 internal constant _ERC721_RECEIVED = type(IERC721Receiver).interfaceId;

    uint256 internal constant _APPROVAL_BIT_TOKEN_OWNER_ = 1 << 160;

    /* owner => NFT balance */
    mapping(address => uint256) internal _nftBalances;

    /* NFT ID => operator */
    mapping(uint256 => address) internal _nftApprovals;

    /// @dev See {IERC165-supportsInterface(bytes4)}.
    function supportsInterface(bytes4 interfaceId) public view virtual override returns (bool) {
        return super.supportsInterface(interfaceId) || interfaceId == _ERC721_INTERFACE_ID || interfaceId == _ERC721_METADATA_INTERFACE_ID;
    }

    //===================================== ERC721 ==========================================/

    /// @dev See {IERC721-balanceOf(address)}.
    function balanceOf(address tokenOwner) external view virtual override returns (uint256) {
        require(tokenOwner != address(0), "Inventory: zero address");
        return _nftBalances[tokenOwner];
    }

    /// @dev See {IERC721-ownerOf(uint256)} and {IERC1155Inventory-ownerOf(uint256)}.
    function ownerOf(uint256 nftId) public view virtual override(IERC721, ERC1155InventoryBase) returns (address) {
        return ERC1155InventoryBase.ownerOf(nftId);
    }

    /// @dev See {IERC721-approve(address,uint256)}.
    function approve(address to, uint256 nftId) external virtual override {
        address tokenOwner = ownerOf(nftId);
        require(to != tokenOwner, "Inventory: self-approval");

        address sender = _msgSender();
        require((sender == tokenOwner) || _operators[tokenOwner][sender], "Inventory: non-approved sender");
        _owners[nftId] = uint256(tokenOwner) | _APPROVAL_BIT_TOKEN_OWNER_;
        _nftApprovals[nftId] = to;
        emit Approval(tokenOwner, to, nftId);
    }

    /// @dev See {IERC721-getApproved(uint256)}.
    function getApproved(uint256 nftId) external view virtual override returns (address) {
        uint256 tokenOwner = _owners[nftId];
        require(address(tokenOwner) != address(0), "Inventory: non-existing NFT");
        if (tokenOwner & _APPROVAL_BIT_TOKEN_OWNER_ != 0) {
            return _nftApprovals[nftId];
        } else {
            return address(0);
        }
    }

    /// @dev See {IERC721-isApprovedForAll(address,address)} and {IERC1155-isApprovedForAll(address,address)}
    function isApprovedForAll(address tokenOwner, address operator) public view virtual override(IERC721, ERC1155InventoryBase) returns (bool) {
        return ERC1155InventoryBase.isApprovedForAll(tokenOwner, operator);
    }

    /// @dev See {IERC721-isApprovedForAll(address,address)} and {IERC1155-isApprovedForAll(address,address)}
    function setApprovalForAll(address operator, bool approved) public virtual override(IERC721, ERC1155InventoryBase) {
        return ERC1155InventoryBase.setApprovalForAll(operator, approved);
    }

    /**
     * Unsafely transfers a Non-Fungible Token (ERC721-compatible).
     * @dev See {IERC1155721Inventory-transferFrom(address,address,uint256)}.
     */
    function transferFrom(
        address from,
        address to,
        uint256 nftId
    ) external virtual override {
        _transferFrom(
            from,
            to,
            nftId,
            "",
            /* safe */
            false
        );
    }

    /**
     * Safely transfers a Non-Fungible Token (ERC721-compatible).
     * @dev See {IERC1155721Inventory-safeTransferFrom(address,address,uint256)}.
     */
    function safeTransferFrom(
        address from,
        address to,
        uint256 nftId
    ) external virtual override {
        _transferFrom(
            from,
            to,
            nftId,
            "",
            /* safe */
            true
        );
    }

    /**
     * Safely transfers a Non-Fungible Token (ERC721-compatible).
     * @dev See {IERC1155721Inventory-safeTransferFrom(address,address,uint256,bytes)}.
     */
    function safeTransferFrom(
        address from,
        address to,
        uint256 nftId,
        bytes calldata data
    ) external virtual override {
        _transferFrom(
            from,
            to,
            nftId,
            data,
            /* safe */
            true
        );
    }

    /**
     * Unsafely transfers a batch of Non-Fungible Tokens (ERC721-compatible).
     * @dev See {IERC1155721BatchTransfer-batchTransferFrom(address,address,uint256[])}.
     */
    function batchTransferFrom(
        address from,
        address to,
        uint256[] calldata nftIds
    ) external virtual override {
        require(to != address(0), "Inventory: transfer to zero");
        address sender = _msgSender();
        bool operatable = _isOperatable(from, sender);

        uint256 length = nftIds.length;
        uint256[] memory values = new uint256[](length);

        uint256 nfCollectionId;
        uint256 nfCollectionCount;
        for (uint256 i; i != length; ++i) {
            uint256 nftId = nftIds[i];
            values[i] = 1;
            _transferNFT(from, to, nftId, 1, operatable, true);
            emit Transfer(from, to, nftId);
            uint256 nextCollectionId = nftId.getNonFungibleCollection();
            if (nfCollectionId == 0) {
                nfCollectionId = nextCollectionId;
                nfCollectionCount = 1;
            } else {
                if (nextCollectionId != nfCollectionId) {
                    _transferNFTUpdateCollection(from, to, nfCollectionId, nfCollectionCount);
                    nfCollectionId = nextCollectionId;
                    nfCollectionCount = 1;
                } else {
                    ++nfCollectionCount;
                }
            }
        }

        if (nfCollectionId != 0) {
            _transferNFTUpdateCollection(from, to, nfCollectionId, nfCollectionCount);
            _transferNFTUpdateBalances(from, to, length);
        }

        emit TransferBatch(_msgSender(), from, to, nftIds, values);
        if (to.isContract() && _isERC1155TokenReceiver(to)) {
            _callOnERC1155BatchReceived(from, to, nftIds, values, "");
        }
    }

    /// @dev See {IERC721Metadata-tokenURI(uint256)}.
    function tokenURI(uint256 nftId) external view virtual override returns (string memory) {
        require(address(_owners[nftId]) != address(0), "Inventory: non-existing NFT");
        return uri(nftId);
    }

    //================================== ERC1155 =======================================/

    /**
     * Safely transfers some token (ERC1155-compatible).
     * @dev See {IERC1155721Inventory-safeTransferFrom(address,address,uint256,uint256,bytes)}.
     */
    function safeTransferFrom(
        address from,
        address to,
        uint256 id,
        uint256 value,
        bytes calldata data
    ) external virtual override {
        address sender = _msgSender();
        require(to != address(0), "Inventory: transfer to zero");
        bool operatable = _isOperatable(from, sender);

        if (id.isFungibleToken()) {
            _transferFungible(from, to, id, value, operatable);
        } else if (id.isNonFungibleToken()) {
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
     * Safely transfers a batch of tokens (ERC1155-compatible).
     * @dev See {IERC1155721Inventory-safeBatchTransferFrom(address,address,uint256[],uint256[],bytes)}.
     */
    function safeBatchTransferFrom(
        address from,
        address to,
        uint256[] calldata ids,
        uint256[] calldata values,
        bytes calldata data
    ) external virtual override {
        // internal function to avoid stack too deep error
        _safeBatchTransferFrom(from, to, ids, values, data);
    }

    //================================== ERC1155MetadataURI =======================================/

    /// @dev See {IERC1155MetadataURI-uri(uint256)}.
    function uri(uint256) public view virtual override returns (string memory);

    //================================== ABI-level Internal Functions =======================================/

    /**
     * Safely or unsafely transfers some token (ERC721-compatible).
     * @dev For `safe` transfer, see {IERC1155721Inventory-transferFrom(address,address,uint256)}.
     * @dev For un`safe` transfer, see {IERC1155721Inventory-safeTransferFrom(address,address,uint256,bytes)}.
     */
    function _transferFrom(
        address from,
        address to,
        uint256 nftId,
        bytes memory data,
        bool safe
    ) internal {
        require(to != address(0), "Inventory: transfer to zero");
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
     * Safely transfers a batch of tokens (ERC1155-compatible).
     * @dev See {IERC1155721Inventory-safeBatchTransferFrom(address,address,uint256[],uint256[],bytes)}.
     */
    function _safeBatchTransferFrom(
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory values,
        bytes memory data
    ) internal {
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
            if (id.isFungibleToken()) {
                _transferFungible(from, to, id, values[i], operatable);
            } else if (id.isNonFungibleToken()) {
                _transferNFT(from, to, id, values[i], operatable, true);
                emit Transfer(from, to, id);
                uint256 nextCollectionId = id.getNonFungibleCollection();
                if (nfCollectionId == 0) {
                    nfCollectionId = nextCollectionId;
                    nfCollectionCount = 1;
                } else {
                    if (nextCollectionId != nfCollectionId) {
                        _transferNFTUpdateCollection(from, to, nfCollectionId, nfCollectionCount);
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
            _transferNFTUpdateCollection(from, to, nfCollectionId, nfCollectionCount);
            nftsCount += nfCollectionCount;
            _transferNFTUpdateBalances(from, to, nftsCount);
        }

        emit TransferBatch(_msgSender(), from, to, ids, values);
        if (to.isContract()) {
            _callOnERC1155BatchReceived(from, to, ids, values, data);
        }
    }

    /**
     * Safely or unsafely mints some token (ERC721-compatible).
     * @dev For `safe` mint, see {IERC1155721InventoryMintable-mint(address,uint256)}.
     * @dev For un`safe` mint, see {IERC1155721InventoryMintable-safeMint(address,uint256,bytes)}.
     */
    function _mint(
        address to,
        uint256 nftId,
        bytes memory data,
        bool safe
    ) internal {
        require(to != address(0), "Inventory: transfer to zero");
        require(nftId.isNonFungibleToken(), "Inventory: not an NFT");

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
     * Unsafely mints a batch of Non-Fungible Tokens (ERC721-compatible).
     * @dev See {IERC1155721InventoryMintable-batchMint(address,uint256[])}.
     */
    function _batchMint(address to, uint256[] memory nftIds) internal {
        require(to != address(0), "Inventory: transfer to zero");

        uint256 length = nftIds.length;
        uint256[] memory values = new uint256[](length);

        uint256 nfCollectionId;
        uint256 nfCollectionCount;
        for (uint256 i; i != length; ++i) {
            uint256 nftId = nftIds[i];
            require(nftId.isNonFungibleToken(), "Inventory: not an NFT");
            values[i] = 1;
            _mintNFT(to, nftId, 1, true);
            emit Transfer(address(0), to, nftId);
            uint256 nextCollectionId = nftId.getNonFungibleCollection();
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
     * Safely mints some token (ERC1155-compatible).
     * @dev See {IERC1155721InventoryMintable-safeMint(address,uint256,uint256,bytes)}.
     */
    function _safeMint(
        address to,
        uint256 id,
        uint256 value,
        bytes memory data
    ) internal virtual {
        require(to != address(0), "Inventory: transfer to zero");
        address sender = _msgSender();
        if (id.isFungibleToken()) {
            _mintFungible(to, id, value);
        } else if (id.isNonFungibleToken()) {
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
     * Safely mints a batch of tokens (ERC1155-compatible).
     * @dev See {IERC1155721InventoryMintable-safeBatchMint(address,uint256[],uint256[],bytes)}.
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
            if (id.isFungibleToken()) {
                _mintFungible(to, id, value);
            } else if (id.isNonFungibleToken()) {
                _mintNFT(to, id, value, true);
                emit Transfer(address(0), to, id);
                uint256 nextCollectionId = id.getNonFungibleCollection();
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

    //============================== Internal Helper Functions =======================================/

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
            uint256 collectionId = id.getNonFungibleCollection();
            // it is virtually impossible that a non-fungible collection supply
            // overflows due to the cost of minting individual tokens
            ++_supplies[collectionId];
            ++_balances[collectionId][to];
            ++_nftBalances[to];
        }
    }

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
        if (from != to) {
            _balances[id][from] = balance - value;
            // cannot overflow as supply cannot overflow
            _balances[id][to] += value;
        }
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
            require((owner & _APPROVAL_BIT_TOKEN_OWNER_ != 0) && _msgSender() == _nftApprovals[id], "Inventory: non-approved sender");
        }
        _owners[id] = uint256(to);
        if (!isBatch) {
            _transferNFTUpdateBalances(from, to, 1);
            _transferNFTUpdateCollection(from, to, id.getNonFungibleCollection(), 1);
        }
    }

    function _transferNFTUpdateBalances(
        address from,
        address to,
        uint256 amount
    ) internal virtual {
        if (from != to) {
            // cannot underflow as balance is verified through ownership
            _nftBalances[from] -= amount;
            //  cannot overflow as supply cannot overflow
            _nftBalances[to] += amount;
        }
    }

    function _transferNFTUpdateCollection(
        address from,
        address to,
        uint256 collectionId,
        uint256 amount
    ) internal virtual {
        if (from != to) {
            // cannot underflow as balance is verified through ownership
            _balances[collectionId][from] -= amount;
            // cannot overflow as supply cannot overflow
            _balances[collectionId][to] += amount;
        }
    }

    ///////////////////////////////////// Receiver Calls Internal /////////////////////////////////////

    /**
     * Queries whether a contract implements ERC1155TokenReceiver.
     * @param _contract address of the contract.
     * @return wheter the given contract implements ERC1155TokenReceiver.
     */
    function _isERC1155TokenReceiver(address _contract) internal view returns (bool) {
        bool success;
        bool result;
        bytes memory staticCallData = abi.encodeWithSelector(_ERC165_INTERFACE_ID, _ERC1155_TOKEN_RECEIVER_INTERFACE_ID);
        assembly {
            let call_ptr := add(0x20, staticCallData)
            let call_size := mload(staticCallData)
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
     * Calls {IERC721Receiver-onERC721Received} on a target contract.
     * @dev Reverts if `to` is not a contract.
     * @dev Reverts if the call to the target fails or is refused.
     * @param from Previous token owner.
     * @param to New token owner.
     * @param nftId Identifier of the token transferred.
     * @param data Optional data to send along with the receiver contract call.
     */
    function _callOnERC721Received(
        address from,
        address to,
        uint256 nftId,
        bytes memory data
    ) internal {
        require(IERC721Receiver(to).onERC721Received(_msgSender(), from, nftId, data) == _ERC721_RECEIVED, "Inventory: transfer refused");
    }
}

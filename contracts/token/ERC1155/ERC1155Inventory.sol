// SPDX-License-Identifier: MIT

pragma solidity 0.6.8;

import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/GSN/Context.sol";
import "@openzeppelin/contracts/introspection/ERC165.sol";
import "./../ERC1155/IERC1155.sol";
import "./../ERC1155/IERC1155MetadataURI.sol";
import "./../ERC1155/IERC1155Inventory.sol";
import "./../ERC1155/IERC1155TokenReceiver.sol";

/**
 * @title ERC1155Inventory, a contract which manages up to multiple Collections of Fungible and Non-Fungible Tokens
 * @dev In this implementation, with N representing the Non-Fungible Collection mask length, identifiers can represent either:
 * (a) a Fungible Collection:
 *     - most significant bit == 0
 * (b) a Non-Fungible Collection:
 *     - most significant bit == 1
 *     - (256-N) least significant bits == 0
 * (c) a Non-Fungible Token:
 *     - most significant bit == 1
 *     - (256-N) least significant bits != 0
 * with N = 32.
 * 
 */
abstract contract ERC1155Inventory is IERC1155, IERC1155MetadataURI, IERC1155Inventory, ERC165, Context {
    using Address for address;
    using SafeMath for uint256;

    // bytes4(keccak256("onERC1155Received(address,address,uint256,uint256,bytes)"))
    bytes4 internal constant _ERC1155_RECEIVED = 0xf23a6e61;

    // bytes4(keccak256("onERC1155BatchReceived(address,address,uint256[],uint256[],bytes)"))
    bytes4 internal constant _ERC1155_BATCH_RECEIVED = 0xbc197c81;

    // Burnt non-fungible token owner's magic value
    uint256 internal constant _BURNT_NFT_OWNER = 1 << 255;

    // Non-fungible bit. If an id has this bit set, it is a non-fungible (either collection or token)
    uint256 internal constant _NF_BIT = 1 << 255;

    // Mask for non-fungible collection (including the nf bit)
    uint256 internal constant _NF_COLLECTION_MASK = uint256(type(uint32).max) << 224;
    uint256 internal constant _NF_TOKEN_MASK = ~_NF_COLLECTION_MASK;

    mapping(address => mapping(address => bool)) internal _operators;
    mapping(uint256 => mapping(address => uint256)) internal _balances;
    mapping(uint256 => uint256) internal _supplies;
    mapping(uint256 => uint256) internal _owners;
    mapping(uint256 => address) public creator;

    /**
     * @dev Constructor function
     */
    constructor() internal {
        _registerInterface(type(IERC1155).interfaceId);
        _registerInterface(type(IERC1155MetadataURI).interfaceId);
        _registerInterface(type(IERC1155Inventory).interfaceId);
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
        _safeTransferFrom(from, to, id, value, data, false);
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

    function sameNFTCollectionSafeBatchTransferFrom(
        address from,
        address to,
        uint256[] memory nftIds,
        bytes memory data
    ) public virtual {
        _sameNFTCollectionSafeBatchTransferFrom(from, to, nftIds, data);
    }

    /**
     * @dev See {IERC1155-balanceOf}.
     */
    function balanceOf(address owner, uint256 id) public virtual override view returns (uint256) {
        require(owner != address(0), "Inventory: zero address");

        if (isNFT(id)) {
            return _owners[id] == uint256(owner) ? 1 : 0;
        }

        return _balances[id][owner];
    }

    /**
     * @dev See {IERC1155-balanceOfBatch}.
     */
    function balanceOfBatch(address[] memory owners, uint256[] memory ids)
        public
        virtual
        override
        view
        returns (uint256[] memory)
    {
        require(owners.length == ids.length, "Inventory: inconsistent arrays");

        uint256[] memory balances = new uint256[](owners.length);

        for (uint256 i = 0; i < owners.length; ++i) {
            require(owners[i] != address(0), "Inventory: zero address");

            uint256 id = ids[i];

            if (isNFT(id)) {
                balances[i] = _owners[id] == uint256(owners[i]) ? 1 : 0;
            } else {
                balances[i] = _balances[id][owners[i]];
            }
        }

        return balances;
    }

    /**
     * @dev See {IERC1155-setApprovalForAll}.
     */
    function setApprovalForAll(address operator, bool approved) public virtual override {
        address sender = _msgSender();
        require(operator != sender, "Inventory: self-approval");
        _operators[sender][operator] = approved;
        emit ApprovalForAll(sender, operator, approved);
    }

    /**
     * @dev See {IERC1155-isApprovedForAll}.
     */
    function isApprovedForAll(address tokenOwner, address operator) public virtual override view returns (bool) {
        return _operators[tokenOwner][operator];
    }


    //================================== ERC1155MetadataURI =======================================/

    /**
     * @dev See {IERC1155MetadataURI-uri}.
     */
    function uri(uint256 id) external virtual override view returns (string memory) {
        return _uri(id);
    }


    //================================== ERC1155Inventory  =======================================/

    /**
     * @dev See {IERC1155AssetCollections-isFungible}.
     */
    function isFungible(uint256 id) public virtual override pure returns (bool) {
        return id & _NF_BIT == 0;
    }

    /**
     * @dev See {IERC1155AssetCollections-collectionOf}.
     */
    function collectionOf(uint256 nftId) public virtual override pure returns (uint256) {
        require(isNFT(nftId), "Inventory: not an NFT");
        return nftId & _NF_COLLECTION_MASK;
    }

    /**
     * @dev See {IERC1155AssetCollections-ownerOf}.
     */
    function ownerOf(uint256 nftId) public virtual override view returns (address) {
        address owner = address(_owners[nftId]);
        require(owner != address(0), "Inventory: non-existing NFT");
        return owner;
    }

    /**
     * @dev See {IERC1155AssetCollections-totalSupply}.
     */
    function totalSupply(uint256 id) public virtual override view returns (uint256) {
        if (isNFT(id)) {
            return address(_owners[id]) == address(0) ? 0 : 1;
        } else {
            return _supplies[id];
        }
    }

    //================================== ERC1155Inventory Non-standard helpers =======================================/

    /**
     * @dev Introspects whether an identifier represents an non-fungible token.
     * @param id Identifier to query.
     * @return True if `id` represents an non-fungible token.
     */
    function isNFT(uint256 id) public virtual pure returns (bool) {
        return (id & _NF_BIT) != 0 && (id & _NF_TOKEN_MASK != 0);
    }

    //================================== Metadata Internal =======================================/

    /**
     * @dev (abstract) Returns an URI for a given identifier.
     * @param id Identifier to query the URI of.
     * @return The metadata URI for `id`.
     */
    function _uri(uint256 id) internal virtual view returns (string memory);

    //================================== Inventory Collections Internal =======================================/

    /**
     * Creates a collection (optional).
     * @dev Reverts if `collectionId` does not represent a collection.
     * @dev Reverts if `collectionId` has already been created.
     * @dev Emits a {IERC1155Inventory-CollectionCreated} event.
     * @param collectionId Identifier of the collection.
     */
    function _createCollection(uint256 collectionId) internal virtual {
        require(!isNFT(collectionId), "Inventory: not a collection");
        require(creator[collectionId] == address(0), "Inventory: existing collection");
        creator[collectionId] = _msgSender();
        emit CollectionCreated(collectionId, isFungible(collectionId));
    }

    //================================== Transfer Internal =======================================/

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
     */
    function _safeTransferFrom(
        address from,
        address to,
        uint256 id,
        uint256 value,
        bytes memory data,
        bool isBatch
    ) internal virtual {
        address sender;
        if (!isBatch) {
            require(to != address(0), "Inventory: transfer to zero");
            sender = _msgSender();
            bool operatable = (from == sender) || _operators[from][sender];
            require(operatable, "Inventory: non-approved sender");
        }

        uint256 collectionId;
        if (isFungible(id)) {
            require(value != 0, "Inventory: zero value");
            collectionId = id;
            _balances[collectionId][from] = _balances[collectionId][from].sub(value);
        } else if (id & _NF_TOKEN_MASK != 0) {
            require(value == 1, "Inventory: wrong NFT value");
            require(uint256(from) == _owners[id], "Inventory: non-owned NFT");
            _owners[id] = uint256(to);
            collectionId = id & _NF_COLLECTION_MASK;
            // cannot underflow as balance is verified through ownership
            _balances[collectionId][from] -= value;
        } else {
            revert("Inventory: not a token id");
        }

        // cannot overflow as supply cannot overflow
        _balances[collectionId][to] += value;

        if (!isBatch) {
            emit TransferSingle(sender, from, to, id, value);
            _callOnERC1155Received(from, to, id, value, data);
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
    ) internal virtual {
        require(to != address(0), "Inventory: transfer to zero");
        uint256 length = ids.length;
        require(length == values.length, "Inventory: inconsistent arrays");
        address sender = _msgSender();
        bool operatable = (from == sender) || _operators[from][sender];
        require(operatable, "Inventory: non-approved sender");

        bool isBatch = true;
        for (uint256 i = 0; i < length; i++) {
            _safeTransferFrom(from, to, ids[i], values[i], data, isBatch);
        }

        emit TransferBatch(sender, from, to, ids, values);
        _callOnERC1155BatchReceived(from, to, ids, values, data);
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
    ) internal virtual {
        require(to != address(0), "Inventory: transfer to zero");

        uint256 length = nftIds.length;
        uint256[] memory values = new uint256[](length);

        address sender = _msgSender();
        bool operatable = (from == sender) || _operators[from][sender];
        require(operatable, "Inventory: non-approved sender");

        uint256 collectionId;
        for (uint256 i = 0; i < length; i++) {
            uint256 nftId = nftIds[i];
            require(isNFT(nftId), "Inventory: not an NFT");
            require(_owners[nftId] == uint256(from), "Inventory: non-owned NFT");
            _owners[nftId] = uint256(to);
            values[i] = 1;
            if (i == 0) {
                collectionId = nftId & _NF_COLLECTION_MASK;
            } else {
                require(collectionId == nftId & _NF_COLLECTION_MASK, "Inventory: not same collection");
            }
        }

        // cannot underflow as balance is verified through ownership
        _balances[collectionId][from] -= length;
        // cannot overflow as supply cannot overflow
        _balances[collectionId][to] += length;

        emit TransferBatch(sender, from, to, nftIds, values);
        _callOnERC1155BatchReceived(sender, to, nftIds, values, data);
    }


    //================================== Minting Internal =======================================/

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
    ) internal virtual {
        if (!isBatch) {
            require(to != address(0), "Inventory: transfer to zero");
        }

        uint256 collectionId;
        if (isFungible(id)) {
            require(value != 0, "Inventory: zero value");
            collectionId = id;
            _supplies[collectionId] = _supplies[collectionId].add(value);
        } else if (id & _NF_TOKEN_MASK != 0) {
            require(value == 1, "Inventory: wrong NFT value");
            require(_owners[id] == 0, "Inventory: existing/burnt NFT");

            _owners[id] = uint256(to);

            collectionId = id & _NF_COLLECTION_MASK;
            // it is virtually impossible that a non-fungible collection balance or supply
            // overflows due to the cost of minting unique tokens
            _supplies[collectionId] += value;
        } else {
            revert("Inventory: not a token id");
        }

        // cannot overflow as supply cannot overflow
        _balances[collectionId][to] += value;

        if (!isBatch) {
            emit TransferSingle(_msgSender(), address(0), to, id, value);

            if (safe) {
                _callOnERC1155Received(address(0), to, id, value, data);
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
    ) internal virtual {
        uint256 length = ids.length;
        require(length == values.length, "Inventory: inconsistent arrays");

        require(to != address(0), "Inventory: transfer to zero");

        bool isBatch = true;
        for (uint256 i = 0; i < length; i++) {
            _mint(to, ids[i], values[i], data, safe, isBatch);
        }

        emit TransferBatch(_msgSender(), address(0), to, ids, values);

        if (safe) {
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
    ) internal virtual {
        require(to != address(0), "Inventory: transfer to zero");
        uint256 length = nftIds.length;
        uint256[] memory values = new uint256[](length);

        uint256 collectionId;
        for (uint256 i = 0; i < length; i++) {
            uint256 nftId = nftIds[i];
            require(isNFT(nftId), "Inventory: not an NFT");
            require(_owners[nftId] == 0, "Inventory: existing/burnt NFT");
            _owners[nftId] = uint256(to);
            values[i] = 1;
            if (i == 0) {
                collectionId = nftId & _NF_COLLECTION_MASK;
            } else {
                require(collectionId == nftId & _NF_COLLECTION_MASK, "Inventory: not same collection");
            }
        }

        // it is virtually impossible that a non-fungible collection balance or supply
        // overflows due to the cost of minting unique tokens
        _balances[collectionId][to] += length;
        _supplies[collectionId] += length;

        emit TransferBatch(_msgSender(), address(0), to, nftIds, values);

        if (safe) {
            _callOnERC1155BatchReceived(address(0), to, nftIds, values, data);
        }
    }

    //================================== Burning Internals =======================================/

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
        bool isBatch
    ) internal virtual {
        address sender;
        if (!isBatch) {
            sender = _msgSender();
            bool operatable = (from == sender) || _operators[from][sender];
            require(operatable, "Inventory: non-approved sender");
        }

        uint256 collectionId;
        if (isFungible(id)) {
            require(value != 0, "Inventory: zero value");
            collectionId = id;
            _balances[collectionId][from] = _balances[collectionId][from].sub(value);
        } else if (id & _NF_TOKEN_MASK != 0) {
            require(value == 1, "Inventory: wrong NFT value");
            require(_owners[id] == uint256(from), "Inventory: non-owned NFT");
            _owners[id] = _BURNT_NFT_OWNER;
            collectionId = id & _NF_COLLECTION_MASK;
            // cannot underflow as balance is confirmed through ownership
            _balances[collectionId][from] -= value;
        } else {
            revert("Inventory: not a token id");
        }

        // Cannot underflow
        _supplies[collectionId] -= value;

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
    ) internal virtual {
        uint256 length = ids.length;
        require(length == values.length, "Inventory: inconsistent arrays");

        address sender = _msgSender();
        bool operatable = (from == sender) || _operators[from][sender];
        require(operatable, "Inventory: non-approved sender");

        bool isBatch = true;
        for (uint256 i = 0; i < length; ++i) {
            _burnFrom(from, ids[i], values[i], isBatch);
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
    function _sameNFTCollectionBatchBurnFrom(address from, uint256[] memory nftIds) internal virtual {
        address sender = _msgSender();
        bool operatable = (from == sender) || _operators[from][sender];
        require(operatable, "Inventory: non-approved sender");

        uint256 length = nftIds.length;
        uint256[] memory values = new uint256[](length);

        uint256 collectionId;
        for (uint256 i = 0; i < length; i++) {
            uint256 nftId = nftIds[i];
            require(isNFT(nftId), "Inventory: not an NFT");
            require(_owners[nftId] == uint256(from), "Inventory: non-owned NFT");
            _owners[nftId] = _BURNT_NFT_OWNER;
            values[i] = 1;
            if (i == 0) {
                collectionId = nftId & _NF_COLLECTION_MASK;
            } else {
                require(collectionId == nftId & _NF_COLLECTION_MASK, "Inventory: not same collection");
            }
        }

        // cannot underflow as balance is confirmed through ownership
        _balances[collectionId][from] -= length;
        // cannot underflow
        _supplies[collectionId] -= length;

        emit TransferBatch(sender, from, address(0), nftIds, values);
    }

    //================================== Token Receiver Calls Internal =======================================/

    /**
     * Calls {IERC1155TokenReceiver-onERC1155Received} on a target address.
     *  The call is not executed if the target address is not a contract.
     * @dev Reverts if the call to the target fails or is refused.
     * @param from Previous token owner.
     * @param to New token owner.
     * @param id Identifier of the token transferred.
     * @param value Amount of token transferred.
     * @param data Optional data to send along with the receiver contract call.
     */
    function _callOnERC1155Received(
        address from,
        address to,
        uint256 id,
        uint256 value,
        bytes memory data
    ) internal {
        if (!to.isContract()) {
            return;
        }

        bytes4 retval = IERC1155TokenReceiver(to).onERC1155Received(_msgSender(), from, id, value, data);
        require(retval == _ERC1155_RECEIVED, "Inventory: transfer refused");
    }

    /**
     * Calls {IERC1155TokenReceiver-onERC1155BatchReceived} on a target address.
     *  The call is not executed if the target address is not a contract.
     * @dev Reverts if the call to the target fails or is refused.
     * @param from Previous tokens owner.
     * @param to New tokens owner.
     * @param ids Identifiers of the tokens to transfer.
     * @param values Amounts of tokens to transfer.
     * @param data Optional data to send along with the receiver contract call.
     */
    function _callOnERC1155BatchReceived(
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory values,
        bytes memory data
    ) internal {
        if (!to.isContract()) {
            return;
        }

        bytes4 retval = IERC1155TokenReceiver(to).onERC1155BatchReceived(_msgSender(), from, ids, values, data);
        require(retval == _ERC1155_BATCH_RECEIVED, "Inventory: transfer refused");
    }
}

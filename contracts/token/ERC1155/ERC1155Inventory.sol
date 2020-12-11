// SPDX-License-Identifier: MIT

pragma solidity 0.6.8;

import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "./ERC1155InventoryBase.sol";

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
abstract contract ERC1155Inventory is ERC1155InventoryBase {
    using Address for address;
    using SafeMath for uint256;


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

    //========================== ERC1155Inventory (Optimised Transfer) ================================/

    function sameNFTCollectionSafeBatchTransferFrom(
        address from,
        address to,
        uint256[] memory nftIds,
        bytes memory data
    ) public virtual {
        _sameNFTCollectionSafeBatchTransferFrom(from, to, nftIds, data);
    }

    //============================== Minting Core Internal Helpers =================================/

    function _mintFungible(
        address to,
        uint256 id,
        uint256 value
    ) internal {
        require(value != 0, "Inventory: zero value");
        _supplies[id] = _supplies[id].add(value);
        // cannot overflow as supply cannot overflow
        _balances[id][to] += value;
    }

    function _mintNonFungible(
        address to,
        uint256 id,
        uint256 value,
        bool isSameNFTCollectionOperation
    ) internal {
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
        }
    }

    //============================== Minting Internal Functions ====================================/

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
    ) internal {
        if (!isBatch) {
            require(to != address(0), "Inventory: transfer to zero");
        }

        if (isFungible(id)) {
            _mintFungible(to, id, value);
        } else if (id & _NF_TOKEN_MASK != 0) {
            _mintNonFungible(to, id, value, false);
        } else {
            revert("Inventory: not a token id");
        }

        if (!isBatch) {
            emit TransferSingle(_msgSender(), address(0), to, id, value);
            if (safe && to.isContract()) {
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
        require(to != address(0), "Inventory: transfer to zero");
        uint256 length = ids.length;
        require(length == values.length, "Inventory: inconsistent arrays");

        for (uint256 i = 0; i < length; i++) {
            _mint(to, ids[i], values[i], data, safe, true);
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
    ) internal virtual {
        require(to != address(0), "Inventory: transfer to zero");
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
            _mintNonFungible(to, nftId, 1, true);
        }

        // it is virtually impossible that a non-fungible collection supply
        // overflows due to the cost of minting individual tokens
        _supplies[collectionId] += length;
        _balances[collectionId][to] += length;

        emit TransferBatch(_msgSender(), address(0), to, nftIds, values);
        if (safe && to.isContract()) {
            _callOnERC1155BatchReceived(address(0), to, nftIds, values, data);
        }
    }

    //============================== Transfer Core Internal Helpers =================================/

    function _transferFungible(
        address from,
        address to,
        uint256 id,
        uint256 value
    ) internal {
        require(value != 0, "Inventory: zero value");
        _balances[id][from] = _balances[id][from].sub(value);
        // cannot overflow as supply cannot overflow
        _balances[id][to] += value;
    }

    function _transferNonFungible(
        address from,
        address to,
        uint256 id,
        uint256 value,
        bool isSameNFTCollectionOperation
    ) internal {
        require(value == 1, "Inventory: wrong NFT value");
        require(from == address(_owners[id]), "Inventory: non-owned NFT");
        _owners[id] = uint256(to);
        if (!isSameNFTCollectionOperation) {
            uint256 collectionId = id & _NF_COLLECTION_MASK;
            // cannot underflow as balance is verified through ownership
            _balances[collectionId][from] -= 1;
            // cannot overflow as supply cannot overflow
            _balances[collectionId][to] += 1;
        }
    }

    //============================== Transfer Internal Functions =======================================/

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
    ) internal {
        address sender = _msgSender();
        if (!isBatch) {
            require(to != address(0), "Inventory: transfer to zero");
            require(_isOperatable(from, sender), "Inventory: non-approved sender");
        }

        if (isFungible(id)) {
            _transferFungible(from, to, id, value);
        } else if (id & _NF_TOKEN_MASK != 0) {
            _transferNonFungible(from, to, id, value, false);
        } else {
            revert("Inventory: not a token id");
        }

        if (!isBatch) {
            emit TransferSingle(sender, from, to, id, value);
            if (to.isContract()) {
                _callOnERC1155Received(from, to, id, value, data);
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
    ) internal virtual {
        require(to != address(0), "Inventory: transfer to zero");
        uint256 length = ids.length;
        require(length == values.length, "Inventory: inconsistent arrays");
        address sender = _msgSender();
        require(_isOperatable(from, sender), "Inventory: non-approved sender");

        for (uint256 i = 0; i < length; i++) {
            _safeTransferFrom(from, to, ids[i], values[i], data, true);
        }

        emit TransferBatch(sender, from, to, ids, values);
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
    ) internal virtual {
        require(to != address(0), "Inventory: transfer to zero");
        address sender = _msgSender();
        require(_isOperatable(from, sender), "Inventory: non-approved sender");

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
            _transferNonFungible(from, to, nftId, 1, true);
        }

        // cannot underflow as balance is verified through ownership
        _balances[collectionId][from] -= length;
        // cannot overflow as supply cannot overflow
        _balances[collectionId][to] += length;

        emit TransferBatch(sender, from, to, nftIds, values);
        if (to.isContract()) {
            _callOnERC1155BatchReceived(sender, to, nftIds, values, data);
        }
    }

    //============================== Burning Core Internal Helpers =================================/

    function _burnFungible(
        address from,
        uint256 id,
        uint256 value
    ) internal {
        require(value != 0, "Inventory: zero value");
        _balances[id][from] = _balances[id][from].sub(value);
        // Cannot underflow
        _supplies[id] -= value;
    }

    function _burnNonFungible(
        address from,
        uint256 id,
        uint256 value,
        bool isSameNFTCollectionOperation
    ) internal {
        require(value == 1, "Inventory: wrong NFT value");
        require(from == address(_owners[id]), "Inventory: non-owned NFT");
        _owners[id] = _BURNT_NFT_OWNER;

        if (!isSameNFTCollectionOperation) {
            uint256 collectionId = id & _NF_COLLECTION_MASK;
            // cannot underflow as balance is confirmed through ownership
            _balances[collectionId][from] -= 1;
            // Cannot underflow
            _supplies[collectionId] -= 1;
        }
    }

    //================================ Burning Internal Functions ======================================/

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
    ) internal {
        address sender = _msgSender();
        if (!isBatch) {
            require(_isOperatable(from, sender), "Inventory: non-approved sender");
        }

        if (isFungible(id)) {
            _burnFungible(from, id, value);
        } else if (id & _NF_TOKEN_MASK != 0) {
            _burnNonFungible(from, id, value, false);
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
    ) internal virtual {
        uint256 length = ids.length;
        require(length == values.length, "Inventory: inconsistent arrays");

        address sender = _msgSender();
        require(_isOperatable(from, sender), "Inventory: non-approved sender");

        for (uint256 i = 0; i < length; ++i) {
            _burnFrom(from, ids[i], values[i], true);
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
        require(_isOperatable(from, sender), "Inventory: non-approved sender");

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
            _burnNonFungible(from, nftId, 1, true);
        }

        // cannot underflow as balance is confirmed through ownership
        _balances[collectionId][from] -= length;
        // cannot underflow
        _supplies[collectionId] -= length;

        emit TransferBatch(sender, from, address(0), nftIds, values);
    }
}

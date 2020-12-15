// SPDX-License-Identifier: MIT

pragma solidity 0.6.8;

import "@openzeppelin/contracts/utils/Address.sol";
import "./ERC1155InventoryBase.sol";

/**
 * @title ERC1155Inventory, a contract which manages up to multiple Collections of Fungible and Non-Fungible Tokens
 * @dev In this implementation, with N representing the Non-Fungible Collection mask length, identifiers can represent either:
 * (a) a Fungible Token:
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

    //============================== Minting Core Internal Helpers =================================/

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
        // cannot overflow as any balance is bounded up by the supply which cannot overflow
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
            // cannot overflow as supply cannot overflow
            ++_balances[collectionId][to];
        }
    }

    //============================== Minting Internal Functions ====================================/

    /**
     * Mints some token.
     * @dev Reverts if `isBatch` is false and `to` is the zero address.
     * @dev Reverts if `id` represents a non-fungible collection.
     * @dev Reverts if `id` represents a non-fungible token and `value` is not 1.
     * @dev Reverts if `id` represents a non-fungible token which is owned by a non-zero address.
     * @dev Reverts if `id` represents afungible token and `value` is 0.
     * @dev Reverts if `id` represents afungible token and there is an overflow of supply.
     * @dev Reverts if `isBatch` is false, `safe` is true and the call to the receiver contract fails or is refused.
     * @dev Emits an {IERC1155-TransferSingle} event if `isBatch` is false.
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
    ) internal {
        require(to != address(0), "Inventory: transfer to zero");

        if (isFungible(id)) {
            _mintFungible(to, id, value);
        } else if (id & _NF_TOKEN_MASK != 0) {
            _mintNFT(to, id, value, false);
        } else {
            revert("Inventory: not a token id");
        }

        emit TransferSingle(_msgSender(), address(0), to, id, value);
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
     * @dev Reverts if one of `ids` represents afungible token and its paired value is 0.
     * @dev Reverts if one of `ids` represents afungible token and there is an overflow of supply.
     * @dev Reverts if `safe` is true and the call to the receiver contract fails or is refused.
     * @dev Emits an {IERC1155-TransferBatch} event.
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
        for (uint256 i; i < length; i++) {
            uint256 id = ids[i];
            uint256 value = values[i];
            if (isFungible(id)) {
                _mintFungible(to, id, value); 
            } else if (id & _NF_TOKEN_MASK != 0) {
                _mintNFT(to, id, value, true);
                uint256 nextCollectionId = id & _NF_COLLECTION_MASK;
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
                        nfCollectionCount++;
                    }
                }
            } else {
                revert("Inventory: not a token id");
            }
        }

        if (nfCollectionId != 0) {
            _balances[nfCollectionId][to] += nfCollectionCount;
            _supplies[nfCollectionId] += nfCollectionCount;
        }

        emit TransferBatch(_msgSender(), address(0), to, ids, values);
        if (to.isContract()) {
            _callOnERC1155BatchReceived(address(0), to, ids, values, data);
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
        bool isBatch
    ) internal {
        require(value == 1, "Inventory: wrong NFT value");
        require(from == address(_owners[id]), "Inventory: non-owned NFT");
        _owners[id] = uint256(to);
        if (!isBatch) {
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
     * @dev Reverts if `id` represents afungible token and `value` is 0.
     * @dev Reverts if `id` represents afungible token and `from` doesn't have enough balance.
     * @dev Emits an {IERC1155-TransferSingle} event.
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
    ) internal {
        address sender = _msgSender();
        require(to != address(0), "Inventory: transfer to zero");
        require(_isOperatable(from, sender), "Inventory: non-approved sender");

        if (isFungible(id)) {
            _transferFungible(from, to, id, value);
        } else if (id & _NF_TOKEN_MASK != 0) {
            _transferNFT(from, to, id, value, false);
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
     * @dev Reverts if one of `ids` does not represent a token.
     * @dev Reverts if one of `ids` represents a non-fungible token and `value` is not 1.
     * @dev Reverts if one of `ids` represents a non-fungible token and is not owned by `from`.
     * @dev Reverts if one of `ids` represents afungible token and `value` is 0.
     * @dev Reverts if one of `ids` represents afungible token and `from` doesn't have enough balance.
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

        uint256 nfCollectionId;
        uint256 nfCollectionCount;
        for (uint256 i; i < length; i++) {
            uint256 id = ids[i];
            uint256 value = values[i];
            if (isFungible(id)) {
                _transferFungible(from, to, id, value); 
            } else if (id & _NF_TOKEN_MASK != 0) {
                _transferNFT(from, to, id, value, true);
                uint256 nextCollectionId = id & _NF_COLLECTION_MASK;
                if (nfCollectionId == 0) {
                    nfCollectionId = nextCollectionId;
                    nfCollectionCount = 1;
                } else {
                    if (nextCollectionId != nfCollectionId) {
                        _balances[nfCollectionId][from] -= nfCollectionCount;
                        _balances[nfCollectionId][to] += nfCollectionCount;
                        nfCollectionId = nextCollectionId;
                        nfCollectionCount = 1;
                    } else {
                        nfCollectionCount++;
                    }
                }
            } else {
                revert("Inventory: not a token id");
            }
        }

        if (nfCollectionId != 0) {
            _balances[nfCollectionId][from] -= nfCollectionCount;
            _balances[nfCollectionId][to] += nfCollectionCount;
        }

        emit TransferBatch(sender, from, to, ids, values);
        if (to.isContract()) {
            _callOnERC1155BatchReceived(from, to, ids, values, data);
        }
    }

    //============================== Burning Core Internal Helpers =================================/

    function _burnFungible(
        address from,
        uint256 id,
        uint256 value
    ) internal {
        require(value != 0, "Inventory: zero value");
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
        bool isBatch
    ) internal {
        require(value == 1, "Inventory: wrong NFT value");
        require(from == address(_owners[id]), "Inventory: non-owned NFT");
        _owners[id] = _BURNT_NFT_OWNER;

        if (!isBatch) {
            uint256 collectionId = id & _NF_COLLECTION_MASK;
            // cannot underflow as balance is confirmed through ownership
            --_balances[collectionId][from];
            // Cannot underflow
            --_supplies[collectionId];
        }
    }

    //================================ Burning Internal Functions ======================================/

    /**
     * Burns some token.
     * @dev Reverts if `isBatch` is false and the sender is not approved.
     * @dev Reverts if `id` represents a non-fungible collection.
     * @dev Reverts if `id` represents afungible token and `value` is 0.
     * @dev Reverts if `id` represents afungible token and `value` is higher than `from`'s balance.
     * @dev Reverts if `id` represents a non-fungible token and `value` is not 1.
     * @dev Reverts if `id` represents a non-fungible token which is not owned by `from`.
     * @dev Emits an {IERC1155-TransferSingle} event if `isBatch` is false.
     * @param from Address of the current token owner.
     * @param id Identifier of the token to burn.
     * @param value Amount of token to burn.
     */
    function _burnFrom(
        address from,
        uint256 id,
        uint256 value
    ) internal {
        address sender = _msgSender();
        require(_isOperatable(from, sender), "Inventory: non-approved sender");

        if (isFungible(id)) {
            _burnFungible(from, id, value);
        } else if (id & _NF_TOKEN_MASK != 0) {
            _burnNFT(from, id, value, false);
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
     * @dev Reverts if one of `ids` represents afungible token and `value` is 0.
     * @dev Reverts if one of `ids` represents afungible token and `value` is higher than `from`'s balance.
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

        uint256 nfCollectionId;
        uint256 nfCollectionCount;
        for (uint256 i; i < length; i++) {
            uint256 id = ids[i];
            uint256 value = values[i];
            if (isFungible(id)) {
                _burnFungible(from, id, value); 
            } else if (id & _NF_TOKEN_MASK != 0) {
                _burnNFT(from, id, value, true);
                uint256 nextCollectionId = id & _NF_COLLECTION_MASK;
                if (nfCollectionId == 0) {
                    nfCollectionId = nextCollectionId;
                    nfCollectionCount = 1;
                } else {
                    if (nextCollectionId != nfCollectionId) {
                        _balances[nfCollectionId][from] -= nfCollectionCount;
                        _supplies[nfCollectionId] -= nfCollectionCount;
                        nfCollectionId = nextCollectionId;
                        nfCollectionCount = 1;
                    } else {
                        nfCollectionCount++;
                    }
                }
            } else {
                revert("Inventory: not a token id");
            }
        }

        if (nfCollectionId != 0) {
            _balances[nfCollectionId][from] -= nfCollectionCount;
            _supplies[nfCollectionId] -= nfCollectionCount;
        }

        emit TransferBatch(sender, from, address(0), ids, values);
    }
}

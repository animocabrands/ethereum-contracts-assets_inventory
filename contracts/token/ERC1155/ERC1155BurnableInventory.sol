// SPDX-License-Identifier: MIT

pragma solidity 0.6.8;

import "./ERC1155Inventory.sol";
import "./IERC1155InventoryBurnable.sol";

/**
 * @title ERC1155BurnableInventory, a burnable ERC1155Inventory
 */
abstract contract ERC1155BurnableInventory is IERC1155InventoryBurnable, ERC1155Inventory {
    /**
     * @dev See {IERC1155InventoryBurnable-burnFrom(address,uint256,uint256)}.
     */
    function burnFrom(
        address from,
        uint256 id,
        uint256 value
    ) external virtual override {
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
     * @dev See {IERC1155InventoryBurnable-batchBurnFrom(address,uint256[],uint256[])}.
     */
    function batchBurnFrom(
        address from,
        uint256[] calldata ids,
        uint256[] calldata values
    ) external virtual override {
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
}

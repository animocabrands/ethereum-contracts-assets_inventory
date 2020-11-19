// SPDX-License-Identifier: MIT

pragma solidity 0.6.8;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@animoca/ethereum-contracts-core_library/contracts/access/MinterRole.sol";
import "@animoca/ethereum-contracts-core_library/contracts/utils/types/UInt256ToDecimalString.sol";
import "../../../token/ERC1155/ERC1155Inventory.sol";

contract ERC1155InventoryMock is ERC1155Inventory, Ownable, MinterRole {
    using UInt256ToDecimalString for uint256;

    constructor() public ERC1155Inventory() {}

    //                            ERC1155 Internal Functions                                //

    function _uri(uint256 id) internal override view returns (string memory) {
        return string(abi.encodePacked("https://prefix/json/", id.toDecimalString()));
    }

    //                            Inventory Public Setters                                //

    function createCollection(uint256 collectionId) external onlyOwner {
        _createCollection(collectionId);
    }

    //                               Minting                                //

    function mint(
        address to,
        uint256 id,
        uint256 value
    ) external onlyMinter {
        bytes memory data = "";
        bool safe = false;
        bool isBatch = false;
        _mint(to, id, value, data, safe, isBatch);
    }

    function safeMint(
        address to,
        uint256 id,
        uint256 value
    ) external onlyMinter {
        bytes memory data = "";
        bool safe = true;
        bool isBatch = false;
        _mint(to, id, value, data, safe, isBatch);
    }

    function batchMint(
        address to,
        uint256[] calldata ids,
        uint256[] calldata values
    ) external onlyMinter {
        bytes memory data = "";
        bool safe = false;
        _batchMint(to, ids, values, data, safe);
    }

    function safeBatchMint(
        address to,
        uint256[] calldata ids,
        uint256[] calldata values
    ) external onlyMinter {
        bytes memory data = "";
        bool safe = true;
        _batchMint(to, ids, values, data, safe);
    }

    function sameNFTCollectionBatchMint(address to, uint256[] calldata nftIds) external onlyMinter {
        bytes memory data = "";
        bool safe = false;
        _sameNFTCollectionBatchMint(to, nftIds, data, safe);
    }

    function sameNFTCollectionSafeBatchMint(address to, uint256[] calldata nftIds) external onlyMinter {
        bytes memory data = "";
        bool safe = true;
        _sameNFTCollectionBatchMint(to, nftIds, data, safe);
    }

    //                               Burning                                 //

    function burnFrom(
        address from,
        uint256 id,
        uint256 value
    ) external {
        bool batch = false;
        _burnFrom(from, id, value, batch);
    }

    function batchBurnFrom(
        address from,
        uint256[] calldata ids,
        uint256[] calldata values
    ) external {
        _batchBurnFrom(from, ids, values);
    }

    function sameNFTCollectionBatchBurnFrom(address from, uint256[] calldata nftIds) external {
        _sameNFTCollectionBatchBurnFrom(from, nftIds);
    }
}

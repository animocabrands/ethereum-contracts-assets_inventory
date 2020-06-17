// SPDX-License-Identifier: MIT

pragma solidity 0.6.8;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@animoca/ethereum-contracts-core_library/contracts/access/MinterRole.sol";
import "@animoca/ethereum-contracts-core_library/contracts/utils/types/UInt256ToDecimalString.sol";
import "../../../token/ERC1155/ERC1155PausableInventory.sol";

contract ERC1155PausableInventoryMock is ERC1155PausableInventory, Ownable, MinterRole  {

    using UInt256ToDecimalString for uint256;

    constructor(uint256 nfMaskLength) public ERC1155PausableInventory(nfMaskLength) {}

    function createCollection(uint256 collectionId) external onlyOwner {
        return _createCollection(collectionId);
    }

    function isNFT(uint256 id) external view returns (bool) {
        return _isNFT(id);
    }

    function batchMint(
        address to,
        uint256[] calldata ids,
        uint256[] calldata values
    ) external onlyMinter
    {
        bytes memory data = "";
        bool safe = false;
        _batchMint(to, ids, values, data, safe);
    }

    function safeBatchMint(
        address to,
        uint256[] calldata ids,
        uint256[] calldata values
    ) external onlyMinter
    {
        bytes memory data = "";
        bool safe = true;
        _batchMint(to, ids, values, data, safe);
    }

    function mintNonFungible(
        address to,
        uint256 nftId
    ) external onlyMinter
    {
        bytes memory data = "";
        bool batch = false;
        bool safe = false;
        _mintNonFungible(to, nftId, data, batch, safe);
    }

    function mintFungible(
        address to,
        uint256 collectionId,
        uint256 value
    ) external onlyMinter
    {
        bytes memory data = "";
        bool batch = false;
        bool safe = false;
        _mintFungible(to, collectionId, value, data, batch, safe);
    }

    function burnFrom(
        address from,
        uint256 id,
        uint256 value
    ) external virtual whenNotPaused whenIdNotPaused(id)
    {
        _burnFrom(from, id, value);
    }

    function _uri(uint256 id) internal override view returns (string memory) {
        return string(abi.encodePacked("https://prefix/json/", id.toDecimalString()));
    }
}

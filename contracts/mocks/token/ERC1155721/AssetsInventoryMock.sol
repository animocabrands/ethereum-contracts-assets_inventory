// SPDX-License-Identifier: MIT

pragma solidity 0.6.8;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@animoca/ethereum-contracts-core_library/contracts/access/MinterRole.sol";
import "@animoca/ethereum-contracts-core_library/contracts/utils/types/UInt256ToDecimalString.sol";
import "../../../token/ERC1155721/AssetsInventory.sol";

contract AssetsInventoryMock is AssetsInventory, Ownable, MinterRole  {

    using UInt256ToDecimalString for uint256;

    string public override constant name = "AssetsInventoryMock";
    string public override constant symbol = "AIM";

    constructor(uint256 nfMaskLength) public AssetsInventory(nfMaskLength) {}

    /**
     * @dev This function creates a collection.
     * @param collectionId collection identifier
     */
    function createCollection(uint256 collectionId) external onlyOwner {
        _createCollection(collectionId);
    }

    function isNFT(uint256 id) external view returns (bool) {
        return _isNFT(id);
    }

    /**
     * @dev Public function to non-safely mint a batch of new tokens
     * @param to address address that will own the minted tokens
     * @param ids uint256[] identifiers of the tokens to be minted
     * @param values uint256[] amounts to be minted
     */
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

    /**
     * @dev Public function to safely mint a batch of new tokens
     * @param to address address that will own the minted tokens
     * @param ids uint256[] identifiers of the tokens to be minted
     * @param values uint256[] amounts to be minted
     */
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

     /**
     * @dev Public function to mint one NFT
     * @param to address recipient that will own the minted NFT
     * @param nftId uint256 identifier of the token to be minted
     */
    function mintNonFungible(address to, uint256 nftId) external onlyMinter {
        bytes memory data = "";
        bool batch = false;
        bool safe = false;
        _mintNonFungible(to, nftId, data, batch, safe);
    }

    /**
     * @dev Public function to mint fungible tokens
     * @param to address recipient that will own the minted tokens
     * @param collectionId uint256 identifier of the fungible collection to be minted
     * @param value uint256 amount to mint
     */
    function mintFungible(address to, uint256 collectionId, uint256 value) external onlyMinter {
        bytes memory data = "";
        bool batch = false;
        bool safe = false;
        _mintFungible(to, collectionId, value, data, batch, safe);
    }

    function _uri(uint256 id) internal override view returns (string memory) {
        return string(abi.encodePacked("https://prefix/json/", id.toDecimalString()));
    }
}

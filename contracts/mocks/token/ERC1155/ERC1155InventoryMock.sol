// SPDX-License-Identifier: MIT

pragma solidity 0.6.8;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@animoca/ethereum-contracts-core_library/contracts/access/MinterRole.sol";
import "@animoca/ethereum-contracts-core_library/contracts/utils/types/UInt256ToDecimalString.sol";
import "../../../token/ERC1155/ERC1155Inventory.sol";

contract ERC1155InventoryMock is ERC1155Inventory, Ownable, MinterRole {

    using UInt256ToDecimalString for uint256;

    constructor(uint256 nfMaskLength) public ERC1155Inventory() {}

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
    function mintNonFungible(
        address to,
        uint256 nftId
    ) external onlyMinter
    {
        bytes memory data = "";
        bool safe = false;
        bool batch = false;
        _mint(to, nftId, 1, data, safe, batch);
    }

    /**
     * @dev Public function to mint fungible tokens
     * @param to address recipient that will own the minted tokens
     * @param collectionId uint256 identifier of the fungible collection to be minted
     * @param value uint256 amount to mint
     */
    function mintFungible(
        address to,
        uint256 collectionId,
        uint256 value
    ) external onlyMinter
    {
        bytes memory data = "";
        bool safe = false;
        bool batch = false;
        _mint(to, collectionId, value, data, safe, batch);
    }

    function burnFrom(address from, uint256 id, uint256 value) external {
        bool batch = false;
        _burnFrom(from, id, value, batch);
    }

    function batchBurnFrom(address from, uint256[] calldata ids, uint256[] calldata values) external {
        _batchBurnFrom(from, ids, values);
    }

    function _uri(uint256 id) internal override view returns (string memory) {
        return string(abi.encodePacked("https://prefix/json/", id.toDecimalString()));
    }
}

pragma solidity ^0.6.6;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@animoca/ethereum-contracts-core_library/contracts/access/MinterRole.sol";
import "../../../token/ERC1155721/NonBurnablePausableInventory.sol";
import "./URI.sol";

contract NonBurnablePausableInventoryMock is NonBurnablePausableInventory, Ownable, MinterRole, URI {

    string public override constant name = "NonBurnablePausableInventoryMock";
    string public override constant symbol = "NBPIM";

    constructor(uint256 nfMaskLength) public NonBurnablePausableInventory(nfMaskLength) {}

    /**
     * @dev This function creates the collection id.
     * @param collectionId collection identifier
     */
    function createCollection(uint256 collectionId) onlyOwner external {
        require(!isNFT(collectionId));
        emit URI(_uri(collectionId), collectionId);
    }

    /**
     * @dev Public function to mint a batch of new tokens
     * Reverts if some the given token IDs already exist
     * @param to address[] List of addresses that will own the minted tokens
     * @param ids uint256[] List of ids of the tokens to be minted
     * @param values uint256[] List of quantities of ft to be minted
     */
    function batchMint(address[] calldata to, uint256[] calldata ids, uint256[] calldata values) external onlyMinter {
        require(ids.length == to.length &&
            ids.length == values.length,
            "parameter length inconsistent");

        for (uint i = 0; i < ids.length; i++) {
            if (isNFT(ids[i]) && values[i] == 1) {
                _mintNonFungible(to[i], ids[i], true);
            } else if (isFungible(ids[i])) {
                _mintFungible(to[i], ids[i], values[i], true);
            } else {
                revert("Incorrect id");
            }
        }
    }

     /**
     * @dev Public function to mint one non fungible token id
     * Reverts if the given token ID is not non fungible token id
     * @param to address recipient that will own the minted tokens
     * @param tokenId uint256 ID of the token to be minted
     */
    function mintNonFungible(address to, uint256 tokenId) onlyMinter external {
        _mintNonFungible(to, tokenId, false);
    }

    /**
     * @dev Public function to mint fungible token
     * Reverts if the given ID is not fungible collection ID
     * @param to address recipient that will own the minted tokens
     * @param collection uint256 ID of the fungible collection to be minted
     * @param value uint256 amount to mint
     */
    function mintFungible(address to, uint256 collection, uint256 value) onlyMinter external {
        _mintFungible(to, collection, value, false);
    }

    function _uri(uint256 id) internal override view returns (string memory) {
        return _fullUriFromId(id);
    }
}

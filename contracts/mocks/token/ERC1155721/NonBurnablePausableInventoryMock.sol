pragma solidity = 0.5.16;

import "@openzeppelin/contracts/ownership/Ownable.sol";
import "@openzeppelin/contracts/access/roles/MinterRole.sol";
import "@animoca/ethereum-contracts-core_library/contracts/utils/RichUInt256.sol";
import "../../../token/ERC1155721/NonBurnablePausableInventory.sol";

contract NonBurnablePausableInventoryMock is NonBurnablePausableInventory, Ownable, MinterRole {

    using RichUInt256 for uint256;

    constructor(uint256 nfMaskLength) public NonBurnablePausableInventory(nfMaskLength) {}

    /**
     * @dev Gets the token name
     * @return string representing the token name
     */
    function name() external view returns(string memory) {
        return "NonBurnablePausableInventoryMock";
    }

    /**
     * @dev Gets the token symbol
     * @return string representing the token symbol
     */
    function symbol() external view returns(string memory) {
        return "NBPIM";
    }

    /**
     * @dev This function creates the collection id.
     * @param collectionId collection identifier
     */
    function createCollection(uint256 collectionId) onlyOwner external {
        require(!isNFT(collectionId));
        emit URI(_fullUriFromId(collectionId), collectionId);
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
                _mintNonFungible(to[i], ids[i]);
            } else if (isFungible(ids[i])) {
                _mintFungible(to[i], ids[i], values[i]);
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
        require(isNFT(tokenId));
        _mintNonFungible(to, tokenId);
    }

    /**
     * @dev Internal function to mint one non fungible token
     * Reverts if the given token ID already exist
     * @param to address recipient that will own the minted tokens
     * @param id uint256 ID of the token to be minted
     */
    function _mintNonFungible(address to, uint256 id) internal {
        require(!exists(id));
        require(to != address(0x0));

        uint256 collection = id & NF_COLLECTION_MASK;

        _owners[id] = to;
        _nftBalances[to] = SafeMath.add(_nftBalances[to], 1);
        _balances[collection][to] = SafeMath.add(_balances[collection][to], 1);

        emit Transfer(address(0x0), to, id);
        emit TransferSingle(_msgSender(), address(0x0), to, id, 1);

        emit URI(_fullUriFromId(id), id);

        require(
            _checkERC1155AndCallSafeTransfer(_msgSender(), address(0x0), to, id, 1, "", false, false), "failCheck"
        );
    }

    /**
     * @dev Public function to mint fungible token
     * Reverts if the given ID is not fungible collection ID
     * @param to address recipient that will own the minted tokens
     * @param collection uint256 ID of the fungible collection to be minted
     * @param value uint256 amount to mint
     */
    function mintFungible(address to, uint256 collection, uint256 value) onlyMinter external {
        require(isFungible(collection));
        _mintFungible(to, collection, value);
    }

    /**
     * @dev Internal function to mint fungible token
     * Reverts if the given ID is not exsit
     * @param to address recipient that will own the minted tokens
     * @param collection uint256 ID of the fungible collection to be minted
     * @param value uint256 amount to mint
     */
    function _mintFungible(address to, uint256 collection, uint256 value) internal {
        require(to != address(0x0));
        require(value > 0);

        // Grant the items to the caller
        _balances[collection][to] = SafeMath.add(_balances[collection][to], value);

        // Emit the Transfer/Mint event.
        // the 0x0 source address implies a mint
        // It will also provide the circulating supply info.
        emit TransferSingle(_msgSender(), address(0x0), to, collection, value);

        require(
            _checkERC1155AndCallSafeTransfer(_msgSender(), address(0x0), to, collection, value, "", false, false), "failCheck"
        );
    }

    /**
     * @dev Returns an URI for a given ID
     * Throws if the ID does not exist. May return an empty string.
     * @param id uint256 ID of the tokenId / collectionId to query
     * @return string URI of given ID
     */
    function uri(uint256 id) external view returns (string memory) {
        return _uri(id);
    }

    function tokenURI(uint256 tokenId) external view returns (string memory) {
        require(exists(tokenId));
        return _uri(tokenId);
    }

    function _uri(uint256 id) internal pure returns (string memory) {
        return _fullUriFromId(id);
    }

    /**
     * @dev Internal function to convert id to full uri string
     * @param id uint256 ID to convert
     * @return string URI convert from given ID
     */
    function _fullUriFromId(uint256 id) internal pure returns (string memory) {
        return string(abi.encodePacked("https://prefix/json/", id.toString()));
    }
}

// SPDX-License-Identifier: MIT

pragma solidity 0.6.8;

import "@openzeppelin/contracts/GSN/Context.sol";
import "@openzeppelin/contracts/introspection/ERC165.sol";
import "./../ERC1155/IERC1155.sol";
import "./../ERC1155/IERC1155MetadataURI.sol";
import "./../ERC1155/IERC1155Inventory.sol";
import "./../ERC1155/IERC1155TokenReceiver.sol";


abstract contract ERC1155InventoryBase is IERC1155, IERC1155MetadataURI, IERC1155Inventory, ERC165, Context {
    // bytes4(keccak256("onERC1155Received(address,address,uint256,uint256,bytes)"))
    bytes4 internal constant _ERC1155_RECEIVED = 0xf23a6e61;

    // bytes4(keccak256("onERC1155BatchReceived(address,address,uint256[],uint256[],bytes)"))
    bytes4 internal constant _ERC1155_BATCH_RECEIVED = 0xbc197c81;

    // Burnt non-fungible token owner's magic value
    uint256 internal constant _BURNT_NFT_OWNER = 0xdead000000000000000000000000000000000000000000000000000000000000;

    // Non-fungible bit. If an id has this bit set, it is a non-fungible (either collection or token)
    uint256 internal constant _NF_BIT = 1 << 255;

    // Mask for non-fungible collection (including the nf bit)
    uint256 internal constant _NF_COLLECTION_MASK = uint256(type(uint32).max) << 224;
    uint256 internal constant _NF_TOKEN_MASK = ~_NF_COLLECTION_MASK;

    /* owner => operator => approved */
    mapping(address => mapping(address => bool)) internal _operators;

    /* collection ID => owner => balance */
    mapping(uint256 => mapping(address => uint256)) internal _balances;

    /* collection ID => supply */
    mapping(uint256 => uint256) internal _supplies;

    /* NFT ID => owner */
    mapping(uint256 => uint256) internal _owners;

    /* collection ID => creator */
    mapping(uint256 => address) public creators;

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

        for (uint256 i = 0; i != owners.length; ++i) {
            balances[i] = balanceOf(owners[i], ids[i]);
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

    //================================== ERC1155Inventory =======================================/

    /**
     * @dev See {IERC1155Inventory-isFungible}.
     */
    function isFungible(uint256 id) public virtual override pure returns (bool) {
        return id & _NF_BIT == 0;
    }

    /**
     * @dev See {IERC1155Inventory-collectionOf}.
     */
    function collectionOf(uint256 nftId) public virtual override pure returns (uint256) {
        require(isNFT(nftId), "Inventory: not an NFT");
        return nftId & _NF_COLLECTION_MASK;
    }

    /**
     * @dev See {IERC1155Inventory-ownerOf}.
     */
    function ownerOf(uint256 nftId) public virtual override view returns (address) {
        address owner = address(_owners[nftId]);
        require(owner != address(0), "Inventory: non-existing NFT");
        return owner;
    }

    /**
     * @dev See {IERC1155Inventory-totalSupply}.
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

    //================================== Inventory Internal Functions =======================================/

    /**
     * Creates a collection (optional).
     * @dev Reverts if `collectionId` does not represent a collection.
     * @dev Reverts if `collectionId` has already been created.
     * @dev Emits a {IERC1155Inventory-CollectionCreated} event.
     * @param collectionId Identifier of the collection.
     */
    function _createCollection(uint256 collectionId) internal virtual {
        require(!isNFT(collectionId), "Inventory: not a collection");
        require(creators[collectionId] == address(0), "Inventory: existing collection");
        creators[collectionId] = _msgSender();
        emit CollectionCreated(collectionId, isFungible(collectionId));
    }

    /**
     * @dev (abstract) Returns an URI for a given identifier.
     * @param id Identifier to query the URI of.
     * @return The metadata URI for `id`.
     */
    function _uri(uint256 id) internal virtual view returns (string memory);

    /**
     * Returns whether `sender` is authorised to make a transfer on behalf of `from`.
     * @param from The address to check operatibility upon.
     * @param sender The sender address.
     * @return True if sender is `from` or an operator for `from`, false otherwise.
     */
    function _isOperatable(address from, address sender) internal virtual view returns (bool) {
        return (from == sender) || _operators[from][sender];
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
        require(
            IERC1155TokenReceiver(to).onERC1155Received(_msgSender(), from, id, value, data) == _ERC1155_RECEIVED,
            "Inventory: transfer refused"
        );
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
        require(
            IERC1155TokenReceiver(to).onERC1155BatchReceived(_msgSender(), from, ids, values, data) ==
                _ERC1155_BATCH_RECEIVED,
            "Inventory: transfer refused"
        );
    }
}

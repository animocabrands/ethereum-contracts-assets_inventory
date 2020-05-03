pragma solidity ^0.6.6;

import "@animoca/ethereum-contracts-core_library/contracts/access/PauserRole.sol";
import "./AssetsInventory.sol";
import "./../ERC1155/ERC1155PausableCollections.sol";

/**
    @title PausableInventory, an inventory contract with pausable collections
 */
abstract contract PausableInventory is AssetsInventory, ERC1155PausableCollections, PauserRole
{

    constructor(uint256 nfMaskLength) internal AssetsInventory(nfMaskLength)  {}

/////////////////////////////////////////// ERC1155PausableCollections /////////////////////////////////////////////

    modifier whenIdPaused(uint256 id) {
        require(idPaused(id));
        _;
    }

    modifier whenIdNotPaused(uint256 id) {
        require(!idPaused(id)                                                                                            );
        _;
    }

    function idPaused(uint256 id) public virtual view returns (bool) {
        if (isNFT(id)) {
            return _pausedCollections[collectionOf(id)];
        } else {
            return _pausedCollections[id];
        }
    }

    function pauseCollections(uint256[] memory collectionIds) public virtual override onlyPauser {
        for (uint256 i=0; i<collectionIds.length; i++) {
            uint256 collectionId = collectionIds[i];
            require(!isNFT(collectionId)); // only works on collections
            _pausedCollections[collectionId] = true;
        }
        emit CollectionsPaused(collectionIds, _msgSender());
    }

    function unpauseCollections(uint256[] memory collectionIds) public virtual override onlyPauser {
        for (uint256 i=0; i<collectionIds.length; i++) {
            uint256 collectionId = collectionIds[i];
            require(!isNFT(collectionId)); // only works on collections
            _pausedCollections[collectionId] = false;
        }
        emit CollectionsUnpaused(collectionIds, _msgSender());
    }

    function pause() public virtual override onlyPauser {
        _pause();
    }

    function unpause() public virtual override onlyPauser {
        _unpause();
    }


/////////////////////////////////////////// ERC721 /////////////////////////////////////////////

    function approve(address to, uint256 tokenId
    ) public virtual override whenNotPaused whenIdNotPaused(tokenId) {
        super.approve(to, tokenId);
    }

    function setApprovalForAll(address to, bool approved
    ) public virtual override whenNotPaused {
        super.setApprovalForAll(to, approved);
    }

    function transferFrom(address from, address to, uint256 tokenId
    ) public virtual override whenNotPaused whenIdNotPaused(tokenId) {
        super.transferFrom(from, to, tokenId);
    }

    function safeTransferFrom(address from, address to, uint256 tokenId
    ) public virtual override whenNotPaused whenIdNotPaused(tokenId) {
        super.safeTransferFrom(from, to, tokenId);
    }

    function safeTransferFrom(address from, address to, uint256 tokenId, bytes memory data
    ) public virtual override whenNotPaused whenIdNotPaused(tokenId) {
        super.safeTransferFrom(from, to, tokenId, data);
    }

/////////////////////////////////////////// ERC1155 /////////////////////////////////////////////

    function safeTransferFrom(address from, address to, uint256 id, uint256 value, bytes memory data
    ) public virtual override whenNotPaused whenIdNotPaused(id) {
        super.safeTransferFrom(from, to, id, value, data);
    }

    function safeBatchTransferFrom(address from, address to, uint256[] memory ids, uint256[] memory values, bytes memory data
    ) public virtual override whenNotPaused {
        for (uint256 i = 0; i < ids.length; ++i) {
            require(!idPaused(ids[i]));
        }
        super.safeBatchTransferFrom(from, to, ids, values, data);
    }
}

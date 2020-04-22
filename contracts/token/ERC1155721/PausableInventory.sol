pragma solidity = 0.5.16;

import "./../ERC1155/ERC1155PausableCollections.sol";
import "./AssetsInventory.sol";

/**
    @title PausableInventory, an inventory contract with pausable collections
 */
contract PausableInventory is AssetsInventory, ERC1155PausableCollections
{

    constructor(uint256 nfMaskLength) public AssetsInventory(nfMaskLength)  {}

/////////////////////////////////////////// ERC1155PausableCollections /////////////////////////////////////////////

    modifier whenIdPaused(uint256 id) {
        require(idPaused(id));
        _;
    }

    modifier whenIdNotPaused(uint256 id) {
        require(!idPaused(id)                                                                                            );
        _;
    }

    function idPaused(uint256 id) public view returns (bool) {
        if (isNFT(id)) {
            return _pausedCollections[collectionOf(id)];
        } else {
            return _pausedCollections[id];
        }
    }

    function pauseCollections(uint256[] memory collectionIds) public onlyPauser {
        for (uint256 i=0; i<collectionIds.length; i++) {
            uint256 collectionId = collectionIds[i];
            require(!isNFT(collectionId)); // only works on collections
            _pausedCollections[collectionId] = true;
        }
        emit CollectionsPaused(collectionIds, _msgSender());
    }

    function unpauseCollections(uint256[] memory collectionIds) public onlyPauser {
        for (uint256 i=0; i<collectionIds.length; i++) {
            uint256 collectionId = collectionIds[i];
            require(!isNFT(collectionId)); // only works on collections
            _pausedCollections[collectionId] = false;
        }
        emit CollectionsUnpaused(collectionIds, _msgSender());
    }


/////////////////////////////////////////// ERC721 /////////////////////////////////////////////

    function approve(address to, uint256 tokenId
    ) public whenNotPaused whenIdNotPaused(tokenId) {
        super.approve(to, tokenId);
    }

    function setApprovalForAll(address to, bool approved
    ) public whenNotPaused {
        super.setApprovalForAll(to, approved);
    }

    function transferFrom(address from, address to, uint256 tokenId
    ) public whenNotPaused whenIdNotPaused(tokenId) {
        super.transferFrom(from, to, tokenId);
    }

    function safeTransferFrom(address from, address to, uint256 tokenId
    ) public whenNotPaused whenIdNotPaused(tokenId) {
        super.safeTransferFrom(from, to, tokenId);
    }

    function safeTransferFrom(address from, address to, uint256 tokenId, bytes memory data
    ) public whenNotPaused whenIdNotPaused(tokenId) {
        super.safeTransferFrom(from, to, tokenId, data);
    }

/////////////////////////////////////////// ERC1155 /////////////////////////////////////////////

    function safeTransferFrom(address from, address to, uint256 id, uint256 value, bytes memory data
    ) public whenNotPaused whenIdNotPaused(id) {
        super.safeTransferFrom(from, to, id, value, data);
    }

    function safeBatchTransferFrom(address from, address to, uint256[] memory ids, uint256[] memory values, bytes memory data
    ) public whenNotPaused {
        for (uint256 i = 0; i < ids.length; ++i) {
            require(!idPaused(ids[i]));
        }
        super.safeBatchTransferFrom(from, to, ids, values, data);
    }
}

pragma solidity ^0.6.6;

import "@openzeppelin/contracts/utils/Pausable.sol";
import "@animoca/ethereum-contracts-core_library/contracts/access/PauserRole.sol";
import "../../utils/PausableCollections.sol";
import "./ERC1155AssetsInventory.sol";

/**
 * @title ERC1155PausableInventory, an inventory contract with pausable collections
 */
abstract contract ERC1155PausableInventory is ERC1155AssetsInventory, PausableCollections, Pausable, PauserRole
{

    constructor(uint256 nfMaskLength) internal ERC1155AssetsInventory(nfMaskLength)  {}

/////////////////////////////////////////// Pausable ///////////////////////////////////////

    /**
     * @dev Called by an admin to perform a global-scope level pause of all collections.
     * @dev Does not affect the paused state at the collection-scope level.
     */
    function pause() public virtual onlyPauser {
        _pause();
    }

    /**
     * @dev Called by an admin to perform a global-scope level unpause of all collections.
     * @dev Does not affect the paused state at the collection-scope level.
     */
    function unpause() public virtual onlyPauser {
        _unpause();
    }

/////////////////////////////////////////// PausableCollections /////////////////////////////////////////////

    function pauseCollections(uint256[] memory collectionIds) public virtual onlyPauser {
        for (uint256 i=0; i<collectionIds.length; i++) {
            _pauseCollection(collectionIds[i]);
        }
        emit CollectionsPaused(collectionIds, _msgSender());
    }

    function unpauseCollections(uint256[] memory collectionIds) public virtual onlyPauser {
        for (uint256 i=0; i<collectionIds.length; i++) {
            _unpauseCollection(collectionIds[i]);
        }
        emit CollectionsUnpaused(collectionIds, _msgSender());
    }

    function _idPaused(uint256 id) internal virtual override view returns(bool) {
        if (_isNFT(id)) {
            return _pausedCollections[collectionOf(id)];
        } else {
            return _pausedCollections[id];
        }
    }

    function _isCollectionId(uint256 id) internal virtual override view returns(bool) {
        return !_isNFT(id);
    }

/////////////////////////////////////////// ERC1155 /////////////////////////////////////////////

    function setApprovalForAll(
        address to,
        bool approved
    ) public virtual override whenNotPaused
    {
        super.setApprovalForAll(to, approved);
    }

    function safeTransferFrom(
        address from,
        address to,
        uint256 id,
        uint256 value,
        bytes memory data
    ) public virtual override whenNotPaused whenIdNotPaused(id)
    {
        super.safeTransferFrom(from, to, id, value, data);
    }

    function safeBatchTransferFrom(
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory values,
        bytes memory data
    ) public virtual override whenNotPaused
    {
        for (uint256 i = 0; i < ids.length; ++i) {
            require(!_idPaused(ids[i]), "ERC1155PausableInventory: id is paused");
        }
        super.safeBatchTransferFrom(from, to, ids, values, data);
    }
}

pragma solidity ^0.6.6;

import "@openzeppelin/contracts/utils/Pausable.sol";

abstract contract ERC1155PausableCollections is Pausable {
    event CollectionsPaused(uint256[] collectionIds, address pauser);
    event CollectionsUnpaused(uint256[] collectionIds, address pauser);

    mapping(uint256 => bool) internal _pausedCollections;

    /**
     * @dev Called by an admin to pause a list of collections.
     */
    function pauseCollections(uint256[] memory collectionIds) public virtual;

    /**
     * @dev Called by an admin to unpause a list of collection.
     */
    function unpauseCollections(uint256[] memory collectionIds) public virtual;

    /**
     * @dev Called by an admin to perform a global-scope level pause of all collections.
     * @dev Does not affect the unpaused state at the collection-scope level.
     */
    function pause() public virtual;

    /**
     * @dev Called by an admin to perform a global-scope level unpause of all collections.
     * @dev Does not affect the paused state at the collection-scope level.
     */
    function unpause() public virtual;
}

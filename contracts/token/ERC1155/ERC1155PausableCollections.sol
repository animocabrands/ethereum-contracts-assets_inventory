pragma solidity =0.5.16;

import "@openzeppelin/contracts/lifecycle/Pausable.sol";

contract ERC1155PausableCollections is Pausable {
    event CollectionsPaused(uint256[] collectionIds, address pauser);
    event CollectionsUnpaused(uint256[] collectionIds, address pauser);

    mapping(uint256 => bool) internal _pausedCollections;

    /**
     * @dev Called by an admin to pause a list of collections.
     */
    function pauseCollections(uint256[] memory collectionIds) public;

    /**
     * @dev Called by an admin to unpause a list of collection.
     */
    function unpauseCollections(uint256[] memory collectionIds) public;
}

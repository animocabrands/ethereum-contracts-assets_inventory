// SPDX-License-Identifier: MIT

pragma solidity ^0.6.8;

abstract contract PausableCollections {

    event CollectionsPaused(uint256[] collectionIds, address pauser);
    event CollectionsUnpaused(uint256[] collectionIds, address pauser);

    mapping(uint256 => bool) internal _pausedCollections;

    modifier whenIdPaused(uint256 id) {
        require(_idPaused(id), "PausableCollections: id is not paused");
        _;
    }

    modifier whenIdNotPaused(uint256 id) {
        require(!_idPaused(id), "PausableCollections: id is paused");
        _;
    }

/////////////////////////////////////////// Internal Functions ///////////////////////////////////////

    function _idPaused(uint256 id) internal virtual view returns(bool);

    function _isCollectionId(uint256 id) internal virtual view returns(bool);

    function _pauseCollection(uint256 collectionId) internal virtual {
        require(!_idPaused(collectionId), "PausableCollections: pause a paused collection");
        require(_isCollectionId(collectionId), "ERC1155PausableInventory: id is not a collection");
        _pausedCollections[collectionId] = true;
    }

    function _unpauseCollection(uint256 collectionId) internal virtual {
        require(_idPaused(collectionId), "PausableCollections: unpause a collection not paused");
        require(_isCollectionId(collectionId), "ERC1155PausableInventory: id is not a collection");
        _pausedCollections[collectionId] = false;
    }
}

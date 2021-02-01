// SPDX-License-Identifier: MIT

pragma solidity 0.6.8;

import "./ERC1155InventoryBurnableMock.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract ERC1155InventoryPausableMock is Ownable, Pausable, ERC1155InventoryBurnableMock {
    //================================== Pausable =======================================/

    function pause() external virtual {
        require(owner() == _msgSender(), "Inventory: not the owner");
        _pause();
    }

    function unpause() external virtual {
        require(owner() == _msgSender(), "Inventory: not the owner");
        _unpause();
    }

    //================================== ERC1155 =======================================/

    function safeTransferFrom(
        address from,
        address to,
        uint256 id,
        uint256 value,
        bytes memory data
    ) public virtual override {
        require(!paused(), "Inventory: paused");
        super.safeTransferFrom(from, to, id, value, data);
    }

    function safeBatchTransferFrom(
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory values,
        bytes memory data
    ) public virtual override {
        require(!paused(), "Inventory: paused");
        super.safeBatchTransferFrom(from, to, ids, values, data);
    }

    function safeMint(
        address to,
        uint256 id,
        uint256 value,
        bytes memory data
    ) public virtual override {
        require(!paused(), "Inventory: paused");
        super.safeMint(to, id, value, data);
    }

    function safeBatchMint(
        address to,
        uint256[] memory ids,
        uint256[] memory values,
        bytes memory data
    ) public virtual override {
        require(!paused(), "Inventory: paused");
        super.safeBatchMint(to, ids, values, data);
    }

    function burnFrom(
        address from,
        uint256 id,
        uint256 value
    ) public virtual override {
        require(!paused(), "Inventory: paused");
        super.burnFrom(from, id, value);
    }

    function batchBurnFrom(
        address from,
        uint256[] memory ids,
        uint256[] memory values
    ) public virtual override {
        require(!paused(), "Inventory: paused");
        super.batchBurnFrom(from, ids, values);
    }
}

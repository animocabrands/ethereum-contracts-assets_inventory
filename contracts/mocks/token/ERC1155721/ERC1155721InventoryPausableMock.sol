// SPDX-License-Identifier: MIT

pragma solidity 0.6.8;

import "./ERC1155721InventoryBurnableMock.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

contract ERC1155721InventoryPausableMock is Ownable, Pausable, ERC1155721InventoryBurnableMock {

    //================================== ERC721Metadata =======================================/

    /// @dev See {IERC721Metadata-name()}.
    function name() external view virtual override returns (string memory) {
        return "ERC1155721InventoryPausableMock";
    }

    /// @dev See {IERC721Metadata-symbol()}.
    function symbol() external view virtual override returns (string memory) {
        return "INVP";
    }

    //================================== Pausable =======================================/

    function pause() external virtual {
        require(owner() == _msgSender(), "Inventory: not the owner");
        _pause();
    }

    function unpause() external virtual {
        require(owner() == _msgSender(), "Inventory: not the owner");
        _unpause();
    }

    //================================== ERC721 =======================================/

    function transferFrom(
        address from,
        address to,
        uint256 nftId
    ) public override virtual {
        require(!paused(), "Inventory: paused");
        super.transferFrom(from, to, nftId);
    }

    function batchTransferFrom(
        address from,
        address to,
        uint256[] memory nftIds
    ) public override virtual {
        require(!paused(), "Inventory: paused");
        super.batchTransferFrom(from, to, nftIds);
    }

    function safeTransferFrom(
        address from,
        address to,
        uint256 nftId
    ) public override virtual {
        require(!paused(), "Inventory: paused");
        super.safeTransferFrom(from, to, nftId);
    }

    function safeTransferFrom(
        address from,
        address to,
        uint256 nftId,
        bytes memory data
    ) public override virtual {
        require(!paused(), "Inventory: paused");
        super.safeTransferFrom(from, to, nftId, data);
    }

    function mint(address to, uint256 nftId) public override virtual {
        require(!paused(), "Inventory: paused");
        super.mint(to, nftId);
    }

    function batchMint(address to, uint256[] memory nftIds) public override virtual {
        require(!paused(), "Inventory: paused");
        super.batchMint(to, nftIds);
    }

    function safeMint(
        address to,
        uint256 nftId,
        bytes memory data
    ) public override virtual {
        require(!paused(), "Inventory: paused");
        super.safeMint(to, nftId, data);
    }

    function batchBurnFrom(
        address from,
        uint256[] memory nftIds
    ) public override virtual {
        require(!paused(), "Inventory: paused");
        super.batchBurnFrom(from, nftIds);
    }

    //================================== ERC1155 =======================================/

    function safeTransferFrom(
        address from,
        address to,
        uint256 id,
        uint256 value,
        bytes memory data
    ) public override virtual {
        require(!paused(), "Inventory: paused");
        super.safeTransferFrom(from, to, id, value, data);
    }

    function safeBatchTransferFrom(
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory values,
        bytes memory data
    ) public override virtual {
        require(!paused(), "Inventory: paused");
        super.safeBatchTransferFrom(from, to, ids, values, data);
    }

    function safeMint(
        address to,
        uint256 id,
        uint256 value,
        bytes memory data
    ) public override virtual {
        require(!paused(), "Inventory: paused");
        super.safeMint(to, id, value, data);
    }

    function safeBatchMint(
        address to,
        uint256[] memory ids,
        uint256[] memory values,
        bytes memory data
    ) public override virtual {
        require(!paused(), "Inventory: paused");
        super.safeBatchMint(to, ids, values, data);
    }

    function burnFrom(
        address from,
        uint256 id,
        uint256 value
    ) public override virtual {
        require(!paused(), "Inventory: paused");
        super.burnFrom(from, id, value);
    }

    function batchBurnFrom(
        address from,
        uint256[] memory ids,
        uint256[] memory values
    ) public override virtual {
        require(!paused(), "Inventory: paused");
        super.batchBurnFrom(from, ids, values);
    }
}

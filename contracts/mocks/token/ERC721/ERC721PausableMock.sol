// SPDX-License-Identifier: MIT

pragma solidity 0.6.8;

import "./ERC721Mock.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract ERC721PausableMock is Pausable, Ownable, ERC721Mock {
    //================================== Pausable =======================================/

    function pause() external virtual {
        require(owner() == _msgSender(), "ERC721: not the owner");
        _pause();
    }

    function unpause() external virtual {
        require(owner() == _msgSender(), "ERC721: not the owner");
        _unpause();
    }

    //================================== ERC721 =======================================/

    function transferFrom(
        address from,
        address to,
        uint256 tokenId
    ) public override virtual {
        require(!paused(), "ERC721: paused");
        super.transferFrom(from, to, tokenId);
    }

    function safeTransferFrom(
        address from,
        address to,
        uint256 tokenId
    ) public override virtual {
        require(!paused(), "ERC721: paused");
        super.safeTransferFrom(from, to, tokenId);
    }

    function safeTransferFrom(
        address from,
        address to,
        uint256 tokenId,
        bytes memory data
    ) public override virtual {
        require(!paused(), "ERC721: paused");
        super.safeTransferFrom(from, to, tokenId, data);
    }

    function mint(address to, uint256 tokenId) public override virtual {
        require(!paused(), "ERC721: paused");
        super.mint(to, tokenId);
    }

    function safeMint(
        address to,
        uint256 tokenId,
        bytes memory data
    ) public override virtual {
        require(!paused(), "ERC721: paused");
        super.safeMint(to, tokenId, data);
    }
}

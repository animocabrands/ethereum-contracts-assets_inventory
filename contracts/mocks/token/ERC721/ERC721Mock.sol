// SPDX-License-Identifier: MIT

pragma solidity 0.6.8;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@animoca/ethereum-contracts-core_library/contracts/access/MinterRole.sol";

contract ERC721Mock is ERC721, MinterRole {
    constructor() public ERC721("ERC721Mock", "E721") {}

    /**
     * Unsafely mints a Non-Fungible Token (ERC721-compatible).
     * @dev See {IERC1155721InventoryMintable-mint(address,uint256)}.
     */
    function mint(address to, uint256 nftId) public virtual {
        require(isMinter(_msgSender()), "ERC721: not a minter");
        _mint(to, nftId);
    }

    /**
     * Safely mints a Non-Fungible Token (ERC721-compatible).
     * @dev See {IERC1155721InventoryMintable-safeMint(address,uint256,bytes)}.
     */
    function safeMint(
        address to,
        uint256 nftId,
        bytes memory data
    ) public virtual {
        require(isMinter(_msgSender()), "ERC721: not a minter");
        _safeMint(to, nftId, data);
    }
}

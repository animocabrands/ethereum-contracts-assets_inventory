# Solidity Assets Inventory



IMPORTANT: Some tests might fail because of the following web3 bug: https://github.com/ethereum/web3.js/issues/3272. To solve it, the indexed needs to be removed from tokenId in contracts/token/ERC721/IERC721.sol as follow (see ):
```
    event Transfer(
        address indexed _from,
        address indexed _to,
        uint256 /*indexed*/ _tokenId
    );

    event Approval(
        address indexed _owner,
        address indexed _approved,
        uint256 /*indexed*/ _tokenId
    );
```
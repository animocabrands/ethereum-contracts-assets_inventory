// SPDX-License-Identifier: MIT

pragma solidity ^0.6.8;

import "@animoca/ethereum-contracts-erc20_base/contracts/metatx/ERC20Fees.sol";
import "./ERC1155AssetsInventoryMock.sol";

contract ERC1155MetaInventoryMock is ERC1155AssetsInventoryMock, ERC20Fees {

    constructor(
        uint256 nfMaskLength,
        address gasToken,
        address payoutWallet
    ) public ERC1155AssetsInventoryMock(nfMaskLength) ERC20Fees(gasToken, payoutWallet) {}

    function _msgSender() internal virtual override(Context, ERC20Fees) view returns (address payable) {
        return super._msgSender();
    }

    function _msgData() internal virtual override(Context, ERC20Fees) view returns (bytes memory) {
        return super._msgData();
    }
}


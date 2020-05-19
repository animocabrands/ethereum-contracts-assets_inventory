// SPDX-License-Identifier: MIT

pragma solidity ^0.6.8;

import "@animoca/ethereum-contracts-erc20_base/contracts/metatx/ERC20Fees.sol";
import "./AssetsInventory.sol";

abstract contract MetaInventory is AssetsInventory, ERC20Fees {

    constructor(
        uint256 nfMaskLength,
        address gasToken,
        address payoutWallet
    ) internal AssetsInventory(nfMaskLength) ERC20Fees(gasToken, payoutWallet) {}

    function _msgSender() internal virtual override(Context, ERC20Fees) view returns (address payable) {
        return super._msgSender();
    }

    function _msgData() internal virtual override(Context, ERC20Fees) view returns (bytes memory) {
        return super._msgData();
    }
}


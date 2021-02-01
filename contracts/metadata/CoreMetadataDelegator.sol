// SPDX-License-Identifier: MIT

pragma solidity 0.6.8;

import "@openzeppelin/contracts/introspection/ERC165.sol";
import "./ICoreMetadataDelegator.sol";
import "./ICoreMetadata.sol";

/**
 * @dev Abstract Core Metadata Delegator contract.
 */
abstract contract CoreMetadataDelegator is ICoreMetadataDelegator, ERC165 {
    address public override coreMetadataImplementer;

    constructor() internal {
        _registerInterface(type(ICoreMetadataDelegator).interfaceId);
    }

    function _setInventoryMetadataImplementer(address implementer) internal {
        require(IERC165(implementer).supportsInterface(type(ICoreMetadata).interfaceId), "MetaDeleg: invalid implementer");
        coreMetadataImplementer = implementer;
    }
}

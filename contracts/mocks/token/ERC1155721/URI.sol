pragma solidity ^0.6.6;

import "@animoca/ethereum-contracts-core_library/contracts/utils/RichUInt256.sol";

contract URI {

    using RichUInt256 for uint256;

    /**
     * @dev Internal function to convert id to full uri string
     * @param id uint256 ID to convert
     * @return string URI convert from given ID
     */
    function _fullUriFromId(uint256 id) internal pure returns (string memory) {
        return string(abi.encodePacked("https://prefix/json/", id.toString()));
    }

}
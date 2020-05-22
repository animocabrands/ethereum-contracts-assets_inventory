// SPDX-License-Identifier: MIT

pragma solidity ^0.6.8;

import "@animoca/ethereum-contracts-core_library/contracts/utils/types/UInt256Extract.sol";
import "@animoca/ethereum-contracts-core_library/contracts/algo/EnumMap.sol";
import "./ICoreMetadata.sol";

abstract contract InventoryCoreMetadata is ICoreMetadata {

    using UInt256Extract for uint256;
    using EnumMap for EnumMap.Map;

    uint256 internal constant NF_FLAG = 1 << 255;

    EnumMap.Map internal _fungibleLayout;
    EnumMap.Map internal _nonFungibleLayout;

    function _isFungible(uint256 integer) internal pure returns (bool) {
        return (integer & NF_FLAG) != 0;
    }

    function getAttribute(
        uint256 integer,
        bytes32 name
    ) virtual override public view returns (uint256 value)
    {
        uint256 position;
        if (_isFungible(integer)) {
            position = uint256(_fungibleLayout.get(name));
        } else {
            position = uint256(_nonFungibleLayout.get(name));
        }
        value = integer.extract(
            uint128(position),
            uint128(position >> 128)
        );
    }

    function getAttributes(uint256 integer) virtual override public view returns (
        bytes32[] memory names,
        uint256[] memory values
    ) {
        bool fungible = _isFungible(integer);
        uint256 length;
        if (fungible) {
            length = uint256(_fungibleLayout.length());
        } else {
            length = uint256(_nonFungibleLayout.length());
        }

        names = new bytes32[](length);
        values = new uint256[](length);
        for(uint256 i = 0; i < length; i++) {
            bytes32 name; bytes32 pos;
            if (fungible) {
                (name, pos) = _fungibleLayout.at(i);
            } else {
                (name, pos) = _nonFungibleLayout.at(i);
            }
            uint256 position = uint256(pos);
            names[i] = name;
            values[i] = integer.extract(
                uint128(position),
                uint128(position >> 128)
            );
        }
    }

    function getLayout(bool fungible) virtual public view returns (
        bytes32[] memory names,
        uint256[] memory lengths,
        uint256[] memory indices
    ) {
        uint256 length;
        if (fungible) {
            length = _fungibleLayout.length();
        } else {
            length = _nonFungibleLayout.length();
        }
        names = new bytes32[](length);
        lengths = new uint256[](length);
        indices = new uint256[](length);
        for(uint256 i = 0; i < length; i++) {
            bytes32 name; bytes32 pos;
            if (fungible) {
                (name, pos) = _fungibleLayout.at(i);
            } else {
                (name, pos) = _nonFungibleLayout.at(i);
            }
            uint256 position = uint256(pos);

            names[i] = name;
            lengths[i] = uint128(position);
            indices[i] = uint128(position >> 128);
        }
    }

    function _setLayout(
        bool fungible,
        bytes32[] memory names,
        uint256[] memory lengths,
        uint256[] memory indices
    ) internal
    {
        uint256 size = names.length;
        require(
            (lengths.length == size) && (indices.length == size),
            "CoreMetadata: set layout with inconsistent array lengths"
        );
        _clearLayout(fungible);
        for (uint256 i = 0; i < size; i++) {
            uint256 length = lengths[i];
            uint256 index = indices[i];
            // Ensures extraction preconditions are met
            uint256(0).extract(length, index);

            uint256 position = (index << 128) | length;
            if (fungible) {
                _fungibleLayout.set(names[i], bytes32(position));
            } else {
                _nonFungibleLayout.set(names[i], bytes32(position));
            }
        }
    }

    function _clearLayout(bool fungible) internal {
        if (fungible) {
            uint256 length = _fungibleLayout.length();
            for(uint256 i = 0; i < length; i++) {
                (bytes32 key, ) = _fungibleLayout.at(0);
                _fungibleLayout.remove(key);
            }
        } else {   
            uint256 length = _nonFungibleLayout.length();
            for(uint256 i = 0; i < length; i++) {
                (bytes32 key, ) = _nonFungibleLayout.at(0);
                _nonFungibleLayout.remove(key);
            }
        }
    }
}

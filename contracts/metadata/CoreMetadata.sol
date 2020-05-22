// SPDX-License-Identifier: MIT

pragma solidity ^0.6.8;

import "@openzeppelin/contracts/introspection/IERC165.sol";
import "@animoca/ethereum-contracts-core_library/contracts/utils/types/UInt256Extract.sol";
import "@animoca/ethereum-contracts-core_library/contracts/algo/EnumMap.sol";
import "./ICoreMetadata.sol";

abstract contract CoreMetadata is IERC165, ICoreMetadata {

    bytes4 internal constant ERC165_InterfaceId = type(IERC165).interfaceId;
    bytes4 internal constant CoreMetadata_InterfaceId = type(ICoreMetadata).interfaceId;

    using UInt256Extract for uint256;
    using EnumMap for EnumMap.Map;

    EnumMap.Map internal _bitsLayout;

    /////////////////////////////////////////// ERC165 /////////////////////////////////////////////

    function supportsInterface(bytes4 interfaceId) public virtual override view returns (bool) {
        return (
            interfaceId == ERC165_InterfaceId ||
            interfaceId == CoreMetadata_InterfaceId
        );
    }

    function getAttribute(
        uint256 integer,
        bytes32 name
    ) virtual override public view returns (uint256 value)
    {
        uint256 position = uint256(_bitsLayout.get(name));
        value = integer.extract(
            uint128(position),
            uint128(position >> 128)
        );
    }

    function getAttributes(uint256 integer) virtual override public view returns (
        bytes32[] memory names,
        uint256[] memory values
    ) {
        uint256 length = _bitsLayout.length();
        names = new bytes32[](length);
        values = new uint256[](length);
        for(uint256 i = 0; i < length; i++) {
            (bytes32 name, bytes32 pos) = _bitsLayout.at(i);
            uint256 position = uint256(pos);
            names[i] = name;
            values[i] = integer.extract(
                uint128(position),
                uint128(position >> 128)
            );
        }
    }

    function _getLayout() internal virtual view returns (
        bytes32[] memory names,
        uint256[] memory lengths,
        uint256[] memory indices
    ) {
        uint256 length = _bitsLayout.length();
        names = new bytes32[](length);
        lengths = new uint256[](length);
        indices = new uint256[](length);
        for(uint256 i = 0; i < length; i++) {
            (bytes32 name, bytes32 positionBytes) = _bitsLayout.at(i);
            uint256 position = uint256(positionBytes);

            names[i] = name;
            lengths[i] = uint128(position);
            indices[i] = uint128(position >> 128);
        }
    }

    function _setLayout(
        bytes32[] memory names,
        uint256[] memory lengths,
        uint256[] memory indices
    ) internal virtual
    {
        uint256 size = names.length;
        require(
            (lengths.length == size) && (indices.length == size),
            "CoreMetadata: set layout with inconsistent array lengths"
        );
        _clearLayout();
        for (uint256 i = 0; i < size; i++) {
            uint256 length = lengths[i];
            uint256 index = indices[i];
            // Ensures extraction preconditions are met
            uint256(0).extract(length, index);

            uint256 position = (index << 128) | length;
            _bitsLayout.set(names[i], bytes32(position));
        }
    }

    function _clearLayout() internal virtual {
        uint256 length = _bitsLayout.length();
        for(uint256 i = 0; i < length; i++) {
            (bytes32 key, ) = _bitsLayout.at(0);
            _bitsLayout.remove(key);
        }
    }
}

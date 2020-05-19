// SPDX-License-Identifier: MIT

pragma solidity ^0.6.8;

import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/GSN/Context.sol";
import "@openzeppelin/contracts/introspection/IERC165.sol";
import "./../ERC1155/IERC1155.sol";
import "./../ERC1155/IERC1155MetadataURI.sol";
import "./../ERC1155/IERC1155Collections.sol";
import "./../ERC1155/IERC1155TokenReceiver.sol";

/**
    @title ERC1155AssetsInventory, a contract which manages up to multiple collections of fungible and non-fungible tokens
    @dev In this implementation, with N representing the non-fungible bitmask length, IDs are composed as follow:
    (a) Fungible Collection IDs:
        - most significant bit == 0
    (b) Non-Fungible Collection IDs:
        - most significant bit == 1
        - (256-N) least significant bits == 0
    (c) Non-Fungible Token IDs:
        - most significant bit == 1
        - (256-N) least significant bits != 0

    If non-fungible bitmask length == 1, there is one Non-Fungible Collection represented by the most significant bit set to 1 and other bits set to 0.
    If non-fungible bitmask length > 1, there are multiple Non-Fungible Collections.
 */
abstract contract ERC1155AssetsInventory is IERC165, IERC1155, IERC1155MetadataURI, IERC1155Collections, Context
{
    using Address for address;
    using SafeMath for uint256;

    // ERC165 Interface Ids
    bytes4 constant internal ERC165_InterfaceId = 0x01ffc9a7;
    bytes4 constant internal ERC1155_InterfaceId = 0xd9b67a26;
    bytes4 constant internal ERC1155MetadataURI_InterfaceId = 0x0e89341c;
    bytes4 constant internal ERC1155Collections_InterfaceId = 0x09ce5c46;

    // bytes4(keccak256("onERC1155Received(address,address,uint256,uint256,bytes)"))
    bytes4 constant internal ERC1155_RECEIVED = 0xf23a6e61;

    // bytes4(keccak256("onERC1155BatchReceived(address,address,uint256[],uint256[],bytes)"))
    bytes4 constant internal ERC1155_BATCH_RECEIVED = 0xbc197c81;

    // Non-fungible bit
    uint256 constant internal NF_BIT = 1 << 255;

    // Mask for non-fungible collection (including the nf bit)
    uint256 internal NF_COLLECTION_MASK;

    // id (collection) => owner => balance
    mapping(uint256 => mapping(address => uint256)) internal _balances;

    // owner => operator => approved
    mapping(address => mapping(address => bool)) internal _operatorApprovals;

    // id (collection or nft) => owner
    mapping(uint256 => address) internal _owners;

    /**
     * @dev Constructor function
     * @param nfMaskLength number of bits in the Non-Fungible Collection mask
     */
    constructor(uint256 nfMaskLength) internal {
        require(
            nfMaskLength > 0 && nfMaskLength < 256,
            "ERC1155: incorrect non-fugible mask length"
        );
        uint256 mask = (1 << nfMaskLength) - 1;
        mask = mask << (256 - nfMaskLength);
        NF_COLLECTION_MASK = mask;
    }

    /**
     * @dev (abstract) Internal function which returns an URI for a given identifier
     * @param id uint256 identifier to query
     * @return string the metadata URI
     */
    function _uri(uint256 id) internal virtual view returns(string memory);

    /**
     * @dev Hook that is called before a single token transfer. This includes minting
     * and burning.
     *
     * Calling conditions:
     *
     * - when `from` and `to` are both non-zero, `value` * ``from``'s `id` will be
     * transferred to `to`.
     * - when `from` is zero, `value` * `id` will be minted for `to`.
     * - when `to` is zero, `value` * ``from``'s `id` will be burned.
     * - `from` and `to` are never both zero.
     *
     */
    function _beforeSingleTransfer(
        address from,
        address to,
        uint256 id,
        uint256 value,
        bytes memory data
    ) internal virtual { }

    /**
     * @dev Hook that is called before a batch token transfer. This includes minting
     * and burning.
     *
     * Calling conditions:
     *
     * - when `from` and `to` are both non-zero, `values` * ``from``'s `ids` will be
     * transferred to `to`.
     * - when `from` is zero, `values` * `ids` will be minted for `to`.
     * - when `to` is zero, `values` * ``from``'s `ids` will be burned.
     * - `from` and `to` are never both zero.
     *
     */
    function _beforeBatchTransfer(
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory values,
        bytes memory data
    ) internal virtual { }

/////////////////////////////////////////// ERC165 /////////////////////////////////////////////

    function supportsInterface(bytes4 interfaceId) public virtual override view returns (bool) {
        return (
            interfaceId == ERC165_InterfaceId ||
            interfaceId == ERC1155_InterfaceId ||
            interfaceId == ERC1155MetadataURI_InterfaceId ||
            interfaceId == ERC1155Collections_InterfaceId
        );
    }

/////////////////////////////////////////// ERC1155 /////////////////////////////////////////////

    function safeTransferFrom(
        address from,
        address to,
        uint256 id,
        uint256 value,
        bytes memory data
    ) public virtual override
    {
        address sender = _msgSender();
        bool operatable = (from == sender) || _operatorApprovals[from][sender];

        _beforeSingleTransfer(from, to, id, value, data);

        if (isFungible(id) && value > 0) {
            require(operatable, "ERC1155: transfer by a non-approved sender");
            _transferFungible(from, to, id, value, false);
        } else if (_isNFT(id) && value == 1) {
            _transferNonFungible(from, to, id, operatable, false);
        } else {
            revert("ERC1155: incorrect transfer parameters");
        }

        emit TransferSingle(sender, from, to, id, value);

        _callOnERC1155Received(from, to, id, value, data);
    }

    function safeBatchTransferFrom(
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory values,
        bytes memory data
    ) public virtual override
    {
        require(ids.length == values.length, "ERC1155: inconsistent array lengths");

        address sender = _msgSender();
        bool operatable = (from == sender) || _operatorApprovals[from][sender];

        _beforeBatchTransfer(from, to, ids, values, data);

        for (uint256 i = 0; i < ids.length; ++i) {
            uint256 id = ids[i];
            uint256 value = values[i];

            if (isFungible(id) && value > 0) {
                require(operatable, "AssetsInventory: transfer by a non-approved sender");
                _transferFungible(from, to, id, value, false);
            } else if (_isNFT(id) && value == 1) {
                _transferNonFungible(from, to, id, operatable, false);
            } else {
                revert("ERC1155: incorrect transfer parameters");
            }
        }

        emit TransferBatch(sender, from, to, ids, values);

        _callOnERC1155BatchReceived(from, to, ids, values, data);
    }

    function balanceOf(address tokenOwner, uint256 id) public virtual override view returns (uint256) {
        require(tokenOwner != address(0), "ERC1155: balance of the zero address");

        if (_isNFT(id)) {
            return _owners[id] == tokenOwner ? 1 : 0;
        }

        return _balances[id][tokenOwner];
    }

    function balanceOfBatch(
        address[] memory tokenOwners,
        uint256[] memory ids
    ) public virtual override view returns (uint256[] memory)
    {
        require(tokenOwners.length == ids.length, "ERC1155: inconsistent array lengths");

        uint256[] memory balances = new uint256[](tokenOwners.length);

        for (uint256 i = 0; i < tokenOwners.length; ++i) {
            require(tokenOwners[i] != address(0), "ERC1155: balance of the zero address");

            uint256 id = ids[i];

            if (_isNFT(id)) {
                balances[i] = _owners[id] == tokenOwners[i] ? 1 : 0;
            } else {
                balances[i] = _balances[id][tokenOwners[i]];
            }
        }

        return balances;
    }

    function setApprovalForAll(address operator, bool approved) public virtual override {
        address sender = _msgSender();
        require(operator != sender, "ERC1155: setting approval to caller");
        _operatorApprovals[sender][operator] = approved;
        emit ApprovalForAll(sender, operator, approved);
    }

    function isApprovedForAll(address tokenOwner, address operator) public virtual override view returns (bool) {
        return _operatorApprovals[tokenOwner][operator];
    }

    function uri(uint256 id) external virtual override view returns (string memory) {
        return _uri(id);
    }

/////////////////////////////////////////// ERC1155Collections /////////////////////////////////////////////

    function collectionOf(uint256 nftId) public virtual override view returns (uint256) {
        require(_isNFT(nftId), "ERC1155: collection of incorrect NFT id");
        return nftId & NF_COLLECTION_MASK;
    }

    function isFungible(uint256 id) public virtual override view returns (bool) {
        return id & (NF_BIT) == 0;
    }

    function ownerOf(uint256 nftId) public virtual override view returns (address) {
        require(_isNFT(nftId), "ERC1155: owner of incorrect NFT id");
        address tokenOwner = _owners[nftId];
        require(tokenOwner != address(0), "ERC1155: owner of non-existing NFT");
        return tokenOwner;
    }

    /**
     * @dev This function creates the collection id.
     * @param collectionId collection identifier
     */
    function _createCollection(uint256 collectionId) internal virtual {
        require(!_isNFT(collectionId), "ERC1155: create collection with wrong id");
        emit URI(_uri(collectionId), collectionId);
    }

    /**
     * @dev Internal function to check whether an identifier represents an NFT
     * @param id The identifier to query
     * @return bool true if the identifier represents an NFT
     */
    function _isNFT(uint256 id) internal virtual view returns (bool) {
        return (id & (NF_BIT) != 0) && (id & (~NF_COLLECTION_MASK) != 0);
    }

/////////////////////////////////////////// Transfer Internal Functions ///////////////////////////////////////

    /**
     * @dev Internal function to transfer the ownership of an NFT to another address
     * Requires the msg sender to be the owner, approved, or operator
     * @param from current owner of the NFT
     * @param to address to receive the ownership of the NFT
     * @param nftId uint256 identifier of the NFT to be transferred
     * @param operatable bool to indicate whether the msg sender is operator
     * @param burn bool to indicate whether this is part of a burn operation
     */
    function _transferNonFungible(
        address from,
        address to,
        uint256 nftId,
        bool operatable,
        bool burn
    ) internal virtual
    {
        if (burn) {
            require(to == address(0), "ERC1155: burn to a non-zero address");
        } else {
            require(to != address(0), "ERC1155: transfer to the zero address");
        }

        require(from == _owners[nftId], "ERC1155: transfer of a non-owned NFT");
        require(operatable, "ERC1155: transfer by a non-approved sender");

        uint256 nfCollection = nftId & NF_COLLECTION_MASK;
        _balances[nfCollection][from] = _balances[nfCollection][from].sub(1);

        if (!burn) {
            _balances[nfCollection][to] = _balances[nfCollection][to].add(1);
        }

        _owners[nftId] = to;
    }

    /**
     * @dev Internal function to move `collectionId` fungible tokens `value` from `from` to `to`.
     * @param from current owner of the `collectionId` fungible token
     * @param to address to receive the ownership of the given `collectionId` fungible token
     * @param collectionId uint256 ID of the fungible token to be transferred
     * @param value uint256 transfer amount
     * @param burn bool to indicate whether this is part of a burn operation
     */
    function _transferFungible(
        address from,
        address to,
        uint256 collectionId,
        uint256 value,
        bool burn
    ) internal virtual
    {
        if (burn) {
            require(to == address(0), "ERC1155: burn to a non-zero address");
        } else {
            require(to != address(0), "ERC1155: transfer to the zero address");
        }

        _balances[collectionId][from] = _balances[collectionId][from].sub(value);
        if (!burn) {
            _balances[collectionId][to] = _balances[collectionId][to].add(value);
        }
    }

/////////////////////////////////////////// Minting ///////////////////////////////////////

    /**
     * @dev Internal function to check existence of an NFT
     * @param nftId uint256 identifier of the NFT
     * @return bool whether the NFT belongs to someone
     */
    function _exists(uint256 nftId) internal virtual view returns (bool) {
        address tokenOwner = _owners[nftId];
        return tokenOwner != address(0);
    }

    /**
     * @dev Internal function to mint one NFT
     * @param to address recipient that will own the minted token
     * @param nftId uint256 identifier of the NFT to be minted
     * @param data bytes optional data to send along with the call
     * @param safe bool whether to call the receiver interface
     * @param batch bool whether this function is called as part of a batch operation
     */
    function _mintNonFungible(
        address to,
        uint256 nftId,
        bytes memory data,
        bool safe,
        bool batch
    ) internal virtual
    {
        require(!_exists(nftId), "ERC1155: minting an existing id");

        if (!batch) {
            require(to != address(0), "ERC1155: minting to the zero address");
            require(_isNFT(nftId), "ERC1155: minting an incorrect NFT id");
            _beforeSingleTransfer(address(0), to, nftId, 1, data);
        }

        uint256 collection = nftId & NF_COLLECTION_MASK;

        _owners[nftId] = to;
        _balances[collection][to] = _balances[collection][to].add(1);

        if (!batch) {
            emit TransferSingle(_msgSender(), address(0), to, nftId, 1);
        }

        emit URI(_uri(nftId), nftId);

        if (safe && !batch) {
            _callOnERC1155Received(address(0), to, nftId, 1, data);
        }
    }

    /**
     * @dev Internal function to non-safely mint fungible tokens
     * @param to address recipient that will own the minted tokens
     * @param collectionId uint256 identifier of the fungible collection to mint
     * @param value uint256 amount of tokens to mint
     * @param data bytes optional data to send along with the call
     * @param safe bool whether to call the receiver interface
     * @param batch bool whether this function is called as part of a batch mint
     */
    function _mintFungible(
        address to,
        uint256 collectionId,
        uint256 value,
        bytes memory data,
        bool safe,
        bool batch
    ) internal virtual
    {
        if (!batch) {
            require(to != address(0), "ERC1155: minting to the zero address");
            require(value > 0, "ERC1155: minting zero value");
            require(isFungible(collectionId), "ERC1155: minting an incorrect fungible collection id");

            _beforeSingleTransfer(address(0), to, collectionId, value, data);
        }

        _balances[collectionId][to] = _balances[collectionId][to].add(value);

        if (!batch) {
            emit TransferSingle(_msgSender(), address(0), to, collectionId, value);
        }

        if (safe && !batch) {
            _callOnERC1155Received(address(0), to, collectionId, value, data);
        }
    }

    /**
     * @dev Internal function to non-safely mint a batch of new tokens
     * @param to address address that will own the minted tokens
     * @param ids uint256[] identifiers of the tokens to be minted
     * @param values uint256[] amounts of tokens to be minted
     * @param data bytes optional data to send along with the call
     * @param safe bool whether to call the receiver interface
     */
    function _batchMint(
        address to,
        uint256[] memory ids,
        uint256[] memory values,
        bytes memory data,
        bool safe
    ) internal virtual
    {
        require(ids.length == values.length, "ERC1155: inconsistent array lengths");
        require(to != address(0), "ERC1155: minting to the zero address");

        bool batch = true;

        for (uint256 i = 0; i < ids.length; i++) {
            if (_isNFT(ids[i]) && values[i] == 1) {
                _mintNonFungible(to, ids[i], data, safe, batch);
            } else if (isFungible(ids[i]) && values[i] > 0) {
                _mintFungible(to, ids[i], values[i], data, safe, batch);
            } else {
                revert("ERC1155: incorrect minting parameters");
            }
        }

        emit TransferBatch(_msgSender(), address(0), to, ids, values);

        if (safe) {
            _callOnERC1155BatchReceived(address(0), to, ids, values, data);
        }
    }

/////////////////////////////////////////// Burning ///////////////////////////////////////

    /**
     * @dev Internal function to burn some tokens
     * @param from address the current tokens owner
     * @param id uint256 identifier of the id to burn
     * @param value uint256 the amount of token to burn
     */
    function _burnFrom(
        address from,
        uint256 id,
        uint256 value
    ) internal virtual
    {
        address to = address(0);
        address sender = _msgSender();
        bool operatable = (from == sender) || _operatorApprovals[from][sender];

        _beforeSingleTransfer(from, to, id, value, "");

        if (isFungible(id) && value > 0) {
            require(operatable, "ERC1155: transfer by a non-approved sender");
            _transferFungible(from, to, id, value, true);
        } else if (_isNFT(id) && value == 1) {
            _transferNonFungible(from, to, id, operatable, true);
        } else {
            revert("ERC1155: transfer of a non-fungible collection");
        }

        emit TransferSingle(sender, from, to, id, value);
    }

/////////////////////////////////////////// IERC1155TokenReceiver ///////////////////////////////////////

    /**
     * @dev Internal function to invoke {IERC1155TokenReceiver-onERC1155Received} on a target address.
     * The call is not executed if the target address is not a contract.
     *
     * @param from address representing the previous owner of the given token ID
     * @param to target address that will receive the tokens
     * @param id uint256 identifier to be transferred
     * @param value uint256 amount to be transferred
     * @param data bytes optional data to send along with the call
     */
    function _callOnERC1155Received(
        address from,
        address to,
        uint256 id,
        uint256 value,
        bytes memory data
    ) internal
    {
        if (!to.isContract()) {
            return;
        }

        // solhint-disable-next-line avoid-low-level-calls
        (bool success, bytes memory returndata) = to.call(abi.encodeWithSelector(
            IERC1155TokenReceiver(to).onERC1155Received.selector,
            _msgSender(),
            from,
            id,
            value,
            data
        ));

        _checkReceiverCallReturnValues(success, returndata, ERC1155_RECEIVED);
    }

    /**
     * @dev Internal function to invoke {IERC1155TokenReceiver-onERC1155BatchReceived} on a target address.
     * The call is not executed if the target address is not a contract.
     *
     * @param from address representing the previous owner of the given token ID
     * @param to target address that will receive the tokens
     * @param ids uint256 identifiers to be transferred
     * @param values uint256 amounts to be transferred
     * @param data bytes optional data to send along with the call
     */
    function _callOnERC1155BatchReceived(
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory values,
        bytes memory data
    ) internal
    {
        if (!to.isContract()) {
            return;
        }

        // solhint-disable-next-line avoid-low-level-calls
        (bool success, bytes memory returndata) = to.call(abi.encodeWithSelector(
            IERC1155TokenReceiver(to).onERC1155BatchReceived.selector,
            _msgSender(),
            from,
            ids,
            values,
            data
        ));

        _checkReceiverCallReturnValues(success, returndata, ERC1155_BATCH_RECEIVED);
    }

    /**
     * @dev Internal function which ensure that the result of a receiver function call
     * ran successfully and returned the expected bytes4 value.
     *
     * @param success bool whether the call was a success
     * @param returndata bytes the data returned by the call
     * @param expectedRetval bytes4 the expected return value
     */
    function _checkReceiverCallReturnValues(
        bool success,
        bytes memory returndata,
        bytes4 expectedRetval
    ) internal pure
    {
        if (success) {
            bytes4 retval = abi.decode(returndata, (bytes4));
            require(retval == expectedRetval, "ERC1155: wrong value returned by receiver implementer");
        } else {
            if (returndata.length > 0) {
                // solhint-disable-next-line no-inline-assembly
                assembly {
                    let returndata_size := mload(returndata)
                    revert(add(32, returndata), returndata_size)
                }
            } else {
                revert("ERC1155: transfer to non-receiver contract");
            }
        }
    }
}

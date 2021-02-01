const interfaces = require('./interfaces/ERC165');

// Receiver Magic Values, Bytes4
//bytes4(keccak256("onERC721Received(address,address,uint256,bytes)"))
const ERC721Received_MagicValue = '0x150b7a02';

// bytes4(keccak256("onERC1155Received(address,address,uint256,uint256,bytes)"))
const ERC1155Received_MagicValue = '0xf23a6e61';

// bytes4(keccak256("onERC1155BatchReceived(address,address,uint256[],uint256[],bytes)"))
const ERC1155BatchReceived_MagicValue = '0xbc197c81';

// ERC165 Interface Ids, Bytes4
const ERC721_InterfaceId = interfaces.ERC721.id;
const ERC721Metadata_InterfaceId = interfaces.ERC721Metadata.id;
const ERC721Enumerable_InterfaceId = interfaces.ERC721Enumerable.id;
const ERC721Exists_InterfaceId_Experimental = interfaces.ERC721Exists_Experimental.id;
const ERC721Receiver_InterfaceId = interfaces.ERC721Receiver;
const ERC1155_InterfaceId = interfaces.ERC1155.id;
const ERC1155AssetCollections_InterfaceId_Experimental = interfaces.ERC1155AssetCollections_Experimental.id;
const ERC1155MetadataURI_InterfaceId = interfaces.ERC1155MetadataURI.id;
const ERC1155TokenReceiver_InterfaceId = interfaces.ERC1155TokenReceiver;

const DefaultNFMaskLength = 32;

const DefaultFungibleLayout = [{name: 'baseCollectionId', bits: 256}];

const DefaultNonFungibleLayout = [
  {name: 'baseTokenId', bits: 256 - DefaultNFMaskLength},
  {name: 'baseCollectionId', bits: DefaultNFMaskLength - 1},
  {name: 'nfFlag', bits: 1},
];

module.exports = {
  // Number
  DefaultNFMaskLength,
  Number: {
    DefaultNFMaskLength,
  },

  // Bytes4
  ERC721Received_MagicValue,
  ERC1155Received_MagicValue,
  ERC1155BatchReceived_MagicValue,
  ERC721_InterfaceId,
  ERC721Metadata_InterfaceId,
  ERC721Enumerable_InterfaceId,
  ERC721Exists_InterfaceId_Experimental,
  ERC721Receiver_InterfaceId,
  ERC1155_InterfaceId,
  ERC1155MetadataURI_InterfaceId,
  ERC1155AssetCollections_InterfaceId_Experimental,
  ERC1155TokenReceiver_InterfaceId,
  Bytes4: {
    ERC721Received_MagicValue,
    ERC1155Received_MagicValue,
    ERC1155BatchReceived_MagicValue,
    ERC721_InterfaceId,
    ERC721Metadata_InterfaceId,
    ERC721Enumerable_InterfaceId,
    ERC721Exists_InterfaceId_Experimental,
    ERC721Receiver_InterfaceId,
    ERC1155_InterfaceId,
    ERC1155MetadataURI_InterfaceId,
    ERC1155AssetCollections_InterfaceId_Experimental,
    ERC1155TokenReceiver_InterfaceId,
  },

  // Bits Layouts
  DefaultFungibleLayout,
  DefaultNonFungibleLayout,
};

const {makeInterfaceId} = require('@openzeppelin/test-helpers');

const ERC721_Functions = [
  'balanceOf(address)',
  'ownerOf(uint256)',
  'approve(address,uint256)',
  'getApproved(uint256)',
  'setApprovalForAll(address,bool)',
  'isApprovedForAll(address,address)',
  'transferFrom(address,address,uint256)',
  'safeTransferFrom(address,address,uint256)',
  'safeTransferFrom(address,address,uint256,bytes)',
];

const ERC721Metadata_Functions = ['name()', 'symbol()', 'tokenURI(uint256)'];

const ERC721Enumerable_Functions = ['totalSupply()', 'tokenOfOwnerByIndex(address,uint256)', 'tokenByIndex(uint256)'];

const ERC721Exists_Functions = ['exists(uint256)'];

const ERC721Receiver_Functions = ['onERC721Received(address,address,uint256,bytes)'];

module.exports = {
  ERC721: {
    name: 'ERC721',
    functions: ERC721_Functions,
    id: makeInterfaceId.ERC165(ERC721_Functions),
  }, // '0x80ac58cd'

  ERC721Metadata: {
    name: 'ERC721Metadata',
    functions: ERC721Metadata_Functions,
    id: makeInterfaceId.ERC165(ERC721Metadata_Functions),
  }, // 0x5b5e139f

  ERC721Enumerable: {
    name: 'ERC721Enumerable',
    functions: ERC721Enumerable_Functions,
    id: makeInterfaceId.ERC165(ERC721Enumerable_Functions),
  }, // 0x780e9d63

  ERC721Exists_Experimental: {
    name: 'ERC721Exists_Experimental',
    functions: ERC721Exists_Functions,
    id: makeInterfaceId.ERC165(ERC721Exists_Functions),
  }, // 0x4f558e79

  ERC721Receiver: {
    name: 'ERC721Receiver',
    functions: ERC721Receiver_Functions,
    id: makeInterfaceId.ERC165(ERC721Receiver_Functions),
  }, // 0x150b7a02
};

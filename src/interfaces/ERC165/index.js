const ERC721Interfaces = require('./ERC721');
const ERC1155Interfaces = require('./ERC1155');
const CoreMetadataInterfaces = require('./CoreMetadata');

module.exports = {
    ...ERC721Interfaces,
    ...ERC1155Interfaces,
    ...CoreMetadataInterfaces
}
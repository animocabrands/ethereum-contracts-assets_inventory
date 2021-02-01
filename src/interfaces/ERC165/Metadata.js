const {makeInterfaceId} = require('@openzeppelin/test-helpers');

const CoreMetadataDelegator_Functions = ['coreMetadataImplementer()'];

const CoreMetadata_Functions = ['getAttribute(uint256,bytes32)', 'getAttributes(uint256,bytes32[])', 'getAllAttributes(uint256)'];

const InventoryMetadata_Functions = ['inventoryMetadataDelegator()'];

module.exports = {
  CoreMetadataDelegator: {
    name: 'CoreMetadataDelegator',
    functions: CoreMetadataDelegator_Functions,
    id: makeInterfaceId.ERC165(CoreMetadataDelegator_Functions),
  }, // 0x99359bbe
  CoreMetadata: {
    name: 'CoreMetadata',
    functions: CoreMetadata_Functions,
    id: makeInterfaceId.ERC165(CoreMetadata_Functions),
  }, // '0x8ee235ae'
  InventoryMetadata: {
    name: 'InventoryMetadata',
    functions: InventoryMetadata_Functions,
    id: makeInterfaceId.ERC165(InventoryMetadata_Functions),
  }, // 0x6eec9b72
};

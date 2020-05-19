const { makeInterfaceId } = require('@openzeppelin/test-helpers');

const CoreMetadata_Functions = [
    'getAttribute(uint256,bytes32)',
    'getAttributes(uint256)',
];

module.exports = {
    CoreMetadata: {
        name: 'CoreMetadata',
        functions: CoreMetadata_Functions,
        id: makeInterfaceId.ERC165(CoreMetadata_Functions),
    }, // '0x17a60115'
}

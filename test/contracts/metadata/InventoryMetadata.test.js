const {artifacts, accounts} = require('hardhat');
const {encode, decode} = require('bits.js');
const BigInteger = require('big-integer');
const {BN, expectRevert} = require('@openzeppelin/test-helpers');
const {behaviors, interfaces} = require('@animoca/ethereum-contracts-core_library');
const interfacesMetadata = require('../../../src/interfaces/ERC165/Metadata');
const {DefaultNFMaskLength, DefaultNonFungibleLayout} = require('../../../src/constants');
const {fromBytes32Attribute, toBytes32Attribute} = require('../../../src/helpers/bytes32Attributes');

const Inventory = artifacts.require('ERC1155721InventoryMock');
const InventoryMetadata = artifacts.require('InventoryMetadataMock');

describe('InventoryMetadata', function () {
  const [deployer, purchaser, payout] = accounts;

  beforeEach(async function () {
    const inventory = await Inventory.new(DefaultNFMaskLength);
    this.contract = await InventoryMetadata.new(DefaultNFMaskLength, inventory.address);
  });

  describe('getLayout() / setLayout()', function () {
    const itReverts = function (collectionId, layout, errorMessage) {
      it('reverts', async function () {
        await expectRevert(
          this.contract.setLayout(
            collectionId,
            layout.names.map((x) => toBytes32Attribute(x)),
            layout.lengths,
            layout.indices
          ),
          errorMessage
        );
      });
    };

    const itSetsTheLayout = function (collectionId, layout) {
      it('sets the layout', async function () {
        await this.contract.setLayout(
          collectionId,
          layout.names.map((x) => toBytes32Attribute(x)),
          layout.lengths,
          layout.indices
        );
        const newLayout = await this.contract.getLayout(collectionId);
        newLayout.names.should.have.lengthOf(layout.names.length, 'Wrong names length');
        newLayout.lengths.should.have.lengthOf(layout.lengths.length, 'Wrong lengths length');
        newLayout.indices.should.have.lengthOf(layout.indices.length, 'Wrong indices length');
        for (let i = 0; i < layout.names.length; i++) {
          fromBytes32Attribute(newLayout.names[i]).should.equal(layout.names[i], 'Wrong name');
          newLayout.lengths[i].should.be.bignumber.equal(new BN(layout.lengths[i]), 'Wrong length');
          newLayout.indices[i].should.be.bignumber.equal(new BN(layout.indices[i]), 'Wrong index');
        }
      });
    };

    context('empty layout', function () {
      const layout = {
        names: [],
        lengths: [],
        indices: [],
      };

      itSetsTheLayout(1, layout);
    });

    context('overlapping attributes', function () {
      const layout = {
        names: ['a', 'b', 'c'],
        lengths: [5, 2, 4],
        indices: [0, 1, 4],
      };

      itSetsTheLayout(1, layout);
    });

    context('attribute length = 0', function () {
      const layout = {
        names: ['a'],
        lengths: [0],
        indices: [0],
      };

      itReverts(1, layout, 'UInt256Extract: length is zero');
    });

    context('attribute length = 256', function () {
      const layout = {
        names: ['a'],
        lengths: [256],
        indices: [0],
      };

      itSetsTheLayout(1, layout);
    });

    context('attribute length > 256', function () {
      const layout = {
        names: ['a'],
        lengths: [257],
        indices: [0],
      };

      itReverts(1, layout, 'UInt256Extract: position out of bond');
    });

    context('out of bond position #1', function () {
      const layout = {
        names: ['a'],
        lengths: [1],
        indices: [256],
      };

      itReverts(1, layout, 'UInt256Extract: position out of bond');
    });

    context('out of bond position #2', function () {
      const layout = {
        names: ['a'],
        lengths: [256],
        indices: [1],
      };

      itReverts(1, layout, 'UInt256Extract: position out of bond');
    });

    context('working example #1', function () {
      const layout = {
        names: ['a', 'b'],
        lengths: [100, 156],
        indices: [0, 100],
      };

      itSetsTheLayout(1, layout);
    });

    context('working example #2 (overlapping, inventory-like)', function () {
      const layout = {
        names: [
          'collection_attr1',
          'collection_attr2',
          'collection_attr3',
          'Base Collection ID',
          'token_attr1',
          'token_attr2',
          'token_attr3',
          'token_attr4',
          'Base Token ID',
        ],
        lengths: [16, 8, 8, 32, 32, 64, 64, 64, 224],
        indices: [0, 16, 24, 0, 32, 64, 128, 192, 32],
      };

      itSetsTheLayout('0xF000000000000000000000000000000000000000000000000000000000000000', layout);
    });
  });

  describe('clearLayout()', function () {
    it('clears the layout', async function () {
      const layout = {
        names: ['a'],
        lengths: [256],
        indices: [0],
      };

      const collectionId = 1;

      await this.contract.setLayout(
        collectionId,
        layout.names.map((x) => toBytes32Attribute(x)),
        layout.lengths,
        layout.indices
      );

      await this.contract.clearLayout(collectionId);

      const newLayout = await this.contract.getLayout(collectionId);
      newLayout.names.should.have.lengthOf(0, 'Wrong names length');
      newLayout.lengths.should.have.lengthOf(0, 'Wrong lengths length');
      newLayout.indices.should.have.lengthOf(0, 'Wrong indices length');
    });
  });

  describe('getAttribute() / getAllAttributes()', function () {
    const layout = {
      names: ['token_attr1', 'token_attr2', 'token_attr3', 'token_attr4', 'collection_attr1', 'collection_attr2', 'collection_attr3'],
      lengths: [32, 64, 64, 64, 15, 8, 8],
      indices: [0, 32, 96, 160, 224, 239, 247],
    };

    const bitsLayout = [
      {name: 'token_attr1', bits: 32},
      {name: 'token_attr2', bits: 64},
      {name: 'token_attr3', bits: 64},
      {name: 'token_attr4', bits: 64},
      {name: 'collection_attr1', bits: 15},
      {name: 'collection_attr2', bits: 8},
      {name: 'collection_attr3', bits: 8},
      {name: 'nf_flag', bits: 1},
    ];

    const CollectionAttributes = {
      collection_attr1: BigInteger(24),
      collection_attr2: BigInteger(),
      collection_attr3: BigInteger(53),
      nf_flag: BigInteger(1),
    };

    const NfCollectionId = encode(bitsLayout, {
      token_attr1: BigInteger(),
      token_attr2: BigInteger(),
      token_attr3: BigInteger(),
      token_attr4: BigInteger(),
      ...CollectionAttributes,
    });

    it('retrieves the correct values', async function () {
      await this.contract.setLayout(
        NfCollectionId.toString(10),
        layout.names.map((x) => toBytes32Attribute(x)),
        layout.lengths,
        layout.indices
      );

      const attributes1 = {
        token_attr1: BigInteger(234324321),
        token_attr2: BigInteger('0xFFFFFFFFFFFF'),
        token_attr3: BigInteger(1),
        token_attr4: BigInteger('0xABCDEF'),
        ...CollectionAttributes,
      };
      const nftId = encode(bitsLayout, attributes1);
      const nftDefaultAttributes = decode(DefaultNonFungibleLayout, nftId);

      const attributesValues = await this.contract.getAllAttributes(nftId.toString(10));

      for (const [name, value] of Object.entries({...attributes1, ...nftDefaultAttributes})) {
        if (name == 'nf_flag' || name == 'nfFlag') continue;
        const index = attributesValues.names.map((n) => fromBytes32Attribute(n)).indexOf(name);
        index.should.be.gte(0, `Missing attribute: ${name}`);
        attributesValues.values[index].should.be.bignumber.equal(new BN(`${value}`), `Wrong value for '${name}' from getAllAttributes()`);

        const attributeValue = await this.contract.getAttribute(nftId.toString(10), toBytes32Attribute(name));
        attributeValue.should.be.bignumber.equal(new BN(`${value}`), `Wrong value for '${name}' from getAttribute()`);
      }
    });
  });

  behaviors.shouldSupportInterfaces([interfaces.ERC165, interfacesMetadata.CoreMetadata, interfacesMetadata.InventoryMetadata]);
});

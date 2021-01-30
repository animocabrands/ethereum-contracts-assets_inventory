const {artifacts, accounts} = require('hardhat');
const {encode, decode} = require('bits.js');
const BigInteger = require('big-integer');
const {BN, expectRevert} = require('@openzeppelin/test-helpers');
const {behaviors, interfaces} = require('@animoca/ethereum-contracts-core_library');
const interfacesMetadata = require('../../../src/interfaces/ERC165/Metadata');
const {fromBytes32Attribute, toBytes32Attribute} = require('../../../src/helpers/bytes32Attributes');

const CoreMetadata = artifacts.require('CoreMetadataMock');

describe('CoreMetadata', function () {
  const [deployer, purchaser, payout] = accounts;

  beforeEach(async function () {
    this.contract = await CoreMetadata.new();
  });

  describe('getLayout() / setLayout()', function () {
    const itReverts = function (layout, errorMessage) {
      it('reverts', async function () {
        await expectRevert(
          this.contract.setLayout(
            layout.names.map((x) => toBytes32Attribute(x)),
            layout.lengths,
            layout.indices
          ),
          errorMessage
        );
      });
    };

    const itSetsTheLayout = function (layout) {
      it('sets the layout', async function () {
        await this.contract.setLayout(
          layout.names.map((x) => toBytes32Attribute(x)),
          layout.lengths,
          layout.indices
        );
        const newLayout = await this.contract.getLayout();
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

      itSetsTheLayout(layout);
    });

    context('overlapping attributes', function () {
      const layout = {
        names: ['a', 'b', 'c'],
        lengths: [5, 2, 4],
        indices: [0, 1, 4],
      };

      itSetsTheLayout(layout);
    });

    context('attribute length = 0', function () {
      const layout = {
        names: ['a'],
        lengths: [0],
        indices: [0],
      };

      itReverts(layout, 'UInt256Extract: length is zero');
    });

    context('attribute length = 256', function () {
      const layout = {
        names: ['a'],
        lengths: [256],
        indices: [0],
      };

      itSetsTheLayout(layout);
    });

    context('attribute length > 256', function () {
      const layout = {
        names: ['a'],
        lengths: [257],
        indices: [0],
      };

      itReverts(layout, 'UInt256Extract: out of bond');
    });

    context('out of bond position #1', function () {
      const layout = {
        names: ['a'],
        lengths: [1],
        indices: [256],
      };

      itReverts(layout, 'UInt256Extract: out of bond');
    });

    context('out of bond position #2', function () {
      const layout = {
        names: ['a'],
        lengths: [256],
        indices: [1],
      };

      itReverts(layout, 'UInt256Extract: out of bond');
    });

    context('working example #1', function () {
      const layout = {
        names: ['a', 'b'],
        lengths: [100, 156],
        indices: [0, 100],
      };

      itSetsTheLayout(layout);
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

      itSetsTheLayout(layout);
    });
  });

  describe('clearLayout()', function () {
    it('clears the layout', async function () {
      const layout = {
        names: ['a'],
        lengths: [256],
        indices: [0],
      };

      await this.contract.setLayout(
        layout.names.map((x) => toBytes32Attribute(x)),
        layout.lengths,
        layout.indices
      );

      await this.contract.clearLayout();

      const newLayout = await this.contract.getLayout();
      newLayout.names.should.have.lengthOf(0, 'Wrong names length');
      newLayout.lengths.should.have.lengthOf(0, 'Wrong lengths length');
      newLayout.indices.should.have.lengthOf(0, 'Wrong indices length');
    });
  });

  describe('getAttribute() / getAllAttributes()', function () {
    const layout = {
      names: [
        'collection_attr1',
        'collection_attr2',
        'collection_attr3',
        'baseCollectionId',
        'token_attr1',
        'token_attr2',
        'token_attr3',
        'token_attr4',
        'baseTokenId',
      ],
      lengths: [16, 8, 8, 32, 32, 64, 64, 64, 224],
      indices: [0, 16, 24, 0, 32, 64, 128, 192, 32],
    };

    const bitsLayout1 = [
      {name: 'collection_attr1', bits: 16},
      {name: 'collection_attr2', bits: 8},
      {name: 'collection_attr3', bits: 8},
      {name: 'token_attr1', bits: 32},
      {name: 'token_attr2', bits: 64},
      {name: 'token_attr3', bits: 64},
      {name: 'token_attr4', bits: 64},
    ];

    const bitsLayout2 = [
      {name: 'baseCollectionId', bits: 32},
      {name: 'baseTokenId', bits: 224},
    ];

    it('retrieves the correct values', async function () {
      await this.contract.setLayout(
        layout.names.map((x) => toBytes32Attribute(x)),
        layout.lengths,
        layout.indices
      );

      const attributes1 = {
        collection_attr1: BigInteger(24),
        collection_attr2: BigInteger(),
        collection_attr3: BigInteger(53),
        token_attr1: BigInteger(234324321),
        token_attr2: BigInteger('0xFFFFFFFFFFFF'),
        token_attr3: BigInteger(1),
        token_attr4: BigInteger('0xABCDEF'),
      };
      const integer = encode(bitsLayout1, attributes1);
      const attributes2 = decode(bitsLayout2, integer);

      const attributesValues = await this.contract.getAllAttributes(integer.toString(10));

      for (const [name, value] of Object.entries({...attributes1, ...attributes2})) {
        if (name == 'nf_flag' || name == 'nfFlag') continue;
        const index = attributesValues.names.map((n) => fromBytes32Attribute(n)).indexOf(name);
        index.should.be.gte(0, `Missing attribute: ${name}`);
        attributesValues.values[index].should.be.bignumber.equal(new BN(`${value}`), "Attribute's value from getAllAttributes() is wrong");

        const attributeValue = await this.contract.getAttribute(integer.toString(10), toBytes32Attribute(name));
        attributeValue.should.be.bignumber.equal(new BN(`${value}`), "Attribute's value from getAttribute() is wrong");
      }
    });
  });

  behaviors.shouldSupportInterfaces([interfaces.ERC165, interfacesMetadata.CoreMetadata]);
});

const {accounts, web3} = require('hardhat');
const {expectRevert} = require('@openzeppelin/test-helpers');
const {createFixtureLoader} = require('@animoca/ethereum-contracts-core_library/test/utils/fixture');
const {
  makeFungibleCollectionId,
  makeNonFungibleCollectionId,
  makeNonFungibleTokenId,
} = require('@animoca/blockchain-inventory_metadata').inventoryIds;

const Paused_RevertMessage = 'Pausable: paused';
const IdIsPaused_RevertMessage = 'PausableCollections: id is paused';

function shouldBehaveLikeERC721Pausable({deploy, mint_ERC721, nfMaskLength}) {
  const [deployer, owner, recipient, operator] = accounts;

  const mockData = '0x42';

  const fCollection1 = {
    id: makeFungibleCollectionId(1),
    supply: 1,
  };
  const fCollection2 = {
    id: makeFungibleCollectionId(2),
    supply: 1,
  };

  const nfCollection1 = makeNonFungibleCollectionId(1, nfMaskLength);
  const nfCollection2 = makeNonFungibleCollectionId(2, nfMaskLength);
  const nft1 = makeNonFungibleTokenId(1, 1, nfMaskLength);
  const nft2 = makeNonFungibleTokenId(1, 2, nfMaskLength);
  const nft3 = makeNonFungibleTokenId(2, 2, nfMaskLength);

  describe('like an ERC721Pausable', function () {
    const fixtureLoader = createFixtureLoader(accounts, web3.eth.currentProvider);
    const fixture = async function () {
      this.token = await deploy(deployer);
      await this.token.createCollection(fCollection1.id, {from: deployer});
      await this.token.createCollection(fCollection2.id, {from: deployer});
      await this.token.createCollection(nfCollection1, {from: deployer});
      await this.token.createCollection(nfCollection2, {from: deployer});

      await mint_ERC721(this.token, owner, fCollection1.id, fCollection1.supply, '0x', {from: deployer});
      await mint_ERC721(this.token, owner, fCollection2.id, fCollection2.supply, '0x', {from: deployer});
      await mint_ERC721(this.token, owner, nft1, 1, '0x', {from: deployer});
      await mint_ERC721(this.token, owner, nft2, 1, '0x', {from: deployer});
      await mint_ERC721(this.token, owner, nft3, 1, '0x', {from: deployer});
    };

    beforeEach(async function () {
      await fixtureLoader(fixture, this);
    });

    describe('Pausable', function () {
      context('when not paused', function () {
        it('allows approve', async function () {
          await this.token.approve(operator, nft1, {from: owner});
        });

        it('allows transfers', async function () {
          await this.token.transferFrom(owner, recipient, nft1, {from: owner});
          await this.token.methods['safeTransferFrom(address,address,uint256)'](owner, recipient, nft2, {
            from: owner,
          });
          await this.token.methods['safeTransferFrom(address,address,uint256,bytes)'](owner, recipient, nft3, mockData, {from: owner});
        });
      });

      context('when paused', function () {
        beforeEach(async function () {
          await this.token.pause({from: deployer});
        });

        it('blocks approve', async function () {
          await expectRevert(this.token.approve(operator, nft1, {from: owner}), Paused_RevertMessage);
        });

        it('blocks transfers', async function () {
          await expectRevert(this.token.transferFrom(owner, recipient, nft1, {from: owner}), Paused_RevertMessage);
          await expectRevert(
            this.token.methods['safeTransferFrom(address,address,uint256)'](owner, recipient, nft2, {
              from: owner,
            }),
            Paused_RevertMessage
          );
          await expectRevert(
            this.token.methods['safeTransferFrom(address,address,uint256,bytes)'](owner, recipient, nft3, mockData, {
              from: owner,
            }),
            Paused_RevertMessage
          );
        });
      });
    });
  });
}

module.exports = {
  shouldBehaveLikeERC721Pausable,
};

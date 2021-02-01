const {shouldBehaveLikeERC721Standard} = require('./ERC721.standard.behavior');
const {shouldBehaveLikeERC721Mintable} = require('./ERC721.mintable.behavior');
const {shouldBehaveLikeERC721Burnable} = require('./ERC721.burnable.behavior');
const {shouldBehaveLikeERC721Metadata} = require('./ERC721Metadata.behavior');
const {shouldBehaveLikePausableContract} = require('@animoca/ethereum-contracts-core_library/test/contracts/utils/Pausable.behavior');

function shouldBehaveLikeERC721(implementation) {
  describe('like an ERC721', function () {
    shouldBehaveLikeERC721Standard(implementation);
    shouldBehaveLikeERC721Mintable(implementation);
    shouldBehaveLikeERC721Burnable(implementation);

    if (implementation.interfaces.ERC721Metadata) {
      shouldBehaveLikeERC721Metadata(implementation);
    }

    if (implementation.interfaces.Pausable) {
      shouldBehaveLikePausableContract(implementation);
    }
  });
}

module.exports = {
  shouldBehaveLikeERC721,
};

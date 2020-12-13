module.exports = {
    newABI: false,
    nfMaskLength: 32,
    name: "AssetsInventoryMock",
    symbol: "AIM",
    revertMessages: {
        NonApproved: 'ERC1155: transfer by a non-approved sender',
        NonApproved_Batch: 'AssetsInventory: transfer by a non-approved sender',
        SelfApproval: 'ERC1155: setting approval to caller',
        ZeroAddress: 'ERC1155: balance of the zero address',
        TransferToZero: 'ERC1155: transfer to the zero address',
        InconsistentArrays: 'ERC1155: inconsistent array lengths',
        InsufficientBalance: 'SafeMath: subtraction overflow',
        TransferRejected: 'ERC1155: receiver contract refused the transfer',
        NonExistingNFT: "ERC1155: owner of non-existing NFT",
        NonOwnedNFT: "ERC1155: transfer of a non-owned NFT",
    },
};

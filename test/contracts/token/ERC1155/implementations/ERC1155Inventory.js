module.exports = {
    contract: "ERC1155InventoryMock",
    newABI: true,
    nfMaskLength: 32,
    revertMessages: {
        NonApproved: "Inventory: non-approved sender",
        NonApproved_Batch: "Inventory: non-approved sender",
        SelfApproval: "Inventory: self-approval",
        ZeroAddress: "Inventory: zero address",
        TransferToZero: "Inventory: transfer to zero",
        InconsistentArrays: "Inventory: inconsistent arrays",
        InsufficientBalance: "Inventory: not enough balance",
        TransferRejected: "Inventory: transfer refused",
        NonExistingNFT: "Inventory: non-existing NFT",
        NonOwnedNFT: "Inventory: non-owned NFT",
    },
};

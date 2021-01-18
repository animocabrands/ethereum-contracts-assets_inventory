module.exports = {
    contractName: "ERC1155721InventoryFullMock",
    nfMaskLength: 32,
    suppliesManagement: true,
    name: "ERC1155721InventoryMock",
    symbol: "INV",
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
        WrongNFTValue: "Inventory: wrong NFT value",
        ZeroValue: "Inventory: zero value",
        NotTokenId: "Inventory: not a token id",
        NotNFT: "Inventory: not an NFT",
        ExistingOrBurntNFT: "Inventory: existing/burnt NFT",
        NotMinter: "MinterRole: caller does not have the Minter role",
        SupplyOverflow: "Inventory: supply overflow",
    },
    mint_ERC721: async function(contract, to, nftId, overrides) {
        return contract.mint(to, nftId, overrides);
    },
    safeMint_ERC721: async function(contract, to, nftId, data, overrides) {
        return contract.methods['safeMint(address,uint256,bytes)'](to, nftId, data, overrides);
    },
    batchMint_ERC721: async function(contract, to, nftIds, overrides) {
        return contract.batchMint(to, nftIds, overrides);
    },
    safeMint: async function(contract, to, id, value, data, overrides) {
        return contract.methods['safeMint(address,uint256,uint256,bytes)'](to, id, value, data, overrides);
    },
    safeBatchMint: async function(contract, to, ids, values, data, overrides) {
        return contract.safeBatchMint(to, ids, values, data, overrides);
    },
    batchTransferFrom_ERC721: async function(contract, from, to, nftIds, overrides) {
        return contract.batchTransferFrom(from, to, nftIds, overrides);
    },
    burnFrom_ERC1155: async function(contract, to, id, value, overrides) {
        return contract.burnFrom(to, id, value, overrides);
    },
    batchBurnFrom_ERC1155: async function(contract, to, ids, values, overrides) {
        return contract.batchBurnFrom(to, ids, values, overrides);
    },
};

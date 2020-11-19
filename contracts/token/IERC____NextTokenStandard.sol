// SPDX-License-Identifier: MIT

pragma solidity 0.6.8;


interface IERC____NextTokenStandard {

    event TransferSingle(address indexed operator, address indexed from, address indexed to, uint256 id, uint256 value);
    event TransferBatch(address indexed operator, address indexed from, address indexed to, uint256[] ids, uint256[] values);
    event TransferBatchOperator(address indexed operator, address[] froms, address[] tos, uint256[] ids, uint256[] values);

    event OperatorsApproval (address indexed owner, address[] indexed operators, bool[] approved);

    //                                Approvals                                 //

    function setApprovalForAllBatch(address[] calldata operators, bool[] calldata approved) external;
    function isApprovedForAllBatch(address[] calldata owners, address[] calldata operators) external view returns (bool[] memory approved);

    //                               Transfers                                 //

    function safeTransferFrom(address from, address to, uint256 id, uint256 value, bytes calldata data) external;
    function safeBatchTransferFrom(address from, address to, uint256[] calldata ids, uint256[] calldata values, bytes calldata data) external;
    function safeBatchOperatorTransferFrom(address[] calldata froms, address[] calldata tos, uint256[] calldata ids, uint256[] calldata values, bytes calldata data) external;

    //                           Supply and Ownership                           //

    function totalSupplyBatch(uint256[] calldata ids) external view returns (uint256[] memory supplies);
    function balanceOfBatch(address[] calldata owners, uint256[] calldata ids) external view returns (uint256[] memory balances);
    function ownerOfBatch(uint256[] calldata nftIds) external view returns (address[] memory owners);

    //                         Fungibility Introspection                        //

    function isFungibleBatch(uint256[] calldata ids) external view returns (bool[] memory fungible);
    function collectionOfBatch(uint256[] calldata nftIds) external view returns (uint256[] memory collectionIds);
}

# Solidity Project Assets Inventory

This project serves as a base dependency for Solidity-based assets inventory contract projects by providing related base contracts, constants, and interfaces.


## Table of Contents

- [Overview](#overview)
  * [Installation](#installation)
  * [Usage](#usage)
    - [Solidity Contracts](#solidity-contracts)
    - [Test and Migration Scripts](#test-and-migration-scripts)
- [Notes](#notes)


## Overview


### Installation

Install as a module dependency in your host NodeJS project:

```bash
$ npm install --save @animoca/ethereum-contracts-assets_inventory
```


### Usage

#### Solidity Contracts

Import dependency contracts into your Solidity contracts and derive as needed:

```solidity
import "@animoca/ethereum-contracts-assets_inventory/contracts/{{Contract Group}}/{{Contract}}.sol"
```


#### Test and Migration Scripts

Require the NodeJS module dependency in your test and migration scripts as needed:

```javascript
const { constants, interfaces } = require('@animoca/ethereum-contracts-assets_inventory');
```


## Notes

IMPORTANT: Some tests might fail because of the following web3 bug: https://github.com/ethereum/web3.js/issues/3272. To solve it, the _indexed_ keyword needs to be removed from _tokenId_ field in the `Transfer` and `Approval` events of **contracts/token/ERC721/IERC721.sol**:

```
event Transfer(
    address indexed _from,
    address indexed _to,
    uint256 /*indexed*/ _tokenId
);

event Approval(
    address indexed _owner,
    address indexed _approved,
    uint256 /*indexed*/ _tokenId
);
```

# Solidity Project Assets Inventory

This project serves as a base dependency for Solidity-based assets inventory contract projects by providing related base contracts, constants, and interfaces.


## Table of Contents

- [Overview](#overview)
  * [Installation](#installation)
  * [Usage](#usage)
    - [Solidity Contracts](#solidity-contracts)
    - [Test and Migration Scripts](#test-and-migration-scripts)


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



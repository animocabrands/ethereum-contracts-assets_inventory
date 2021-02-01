const utils = require('web3-utils');
const assert = require('assert');

const toBytes32Attribute = function (name) {
  assert(name.length <= 32, "Attribute's name is too long");
  return utils.fromAscii(name);
};

const fromBytes32Attribute = function (name) {
  return utils.toAscii(name).replace(/\0/g, '');
};

module.exports = {
  toBytes32Attribute,
  fromBytes32Attribute,
};

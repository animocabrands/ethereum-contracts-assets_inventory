const path = require('path');

const normalizePath = (config, userPath, defaultPath) => {
  if (userPath === undefined) {
    userPath = path.join(config.paths.root, defaultPath);
  } else {
    if (!path.isAbsolute(userPath)) {
      userPath = path.normalize(path.join(config.paths.root, userPath));
    }
  }
  return userPath;
};

module.exports = {
  normalizePath,
};

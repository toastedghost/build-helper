#!/usr/bin/env node

var path = require('path');
var fs = require('fs');
var gitDescribeSync = require('git-describe').gitDescribeSync;
var paramaters = [];
var parameterVersion = false;
var packageDefinitionPathNpm = path.join(process.cwd(), 'package.json');
var packageDefinitionPathComposer = path.join(process.cwd(), 'composer.json');
var buildConfigPath = path.join(process.cwd(), 'build-helper-config.json');
var Helper = require('../lib');
var chalk = require('chalk');
var semver = require('semver');
var utils = require('../lib/utils');
var extend = utils.extend;
var isFileReadable = utils.isFileReadable;
var isDefined = utils.isDefined;

var config = isFileReadable(buildConfigPath) ? require(buildConfigPath) : {};

var userPackage = {};
var packageDefinitionPath = null;

// check git info
var gitInfo = gitDescribeSync(process.cwd(), {
  match: '[0-9]*.[0-9]*.[0-9]*'
});
if (gitInfo.semver && gitInfo.semver.version) {
  userPackage.name = path.basename(process.cwd());
  userPackage.version = gitInfo.semver.version;
}
// Checking for package definition
if (isFileReadable(packageDefinitionPathNpm)) {
  userPackage = extend({}, userPackage, require(packageDefinitionPathNpm));
  packageDefinitionPath = packageDefinitionPathNpm;
} else if (isFileReadable(packageDefinitionPathComposer)) {
  userPackage = extend({}, userPackage, require(packageDefinitionPathComposer));
  packageDefinitionPath = packageDefinitionPathComposer;
} else {
  userPackage.status = false;
}

// only valid, if the version and name element is set
if(!(Object.getOwnPropertyNames(userPackage).length) || !(userPackage.hasOwnProperty('version') && userPackage.hasOwnProperty('name'))) {
  console.log(chalk.red('no project file (package.json or composer.json) and no valid tag found'))
  process.exit(1);
}

var options = {
  push: isDefined(config.push) ? config.push : false,
  keep: isDefined(config.keep) ? config.keep : false,
  update: isDefined(config.update) ? config.update : false,
  debug: isDefined(config.debug) ? config.debug : false,
  buildTimestampInName: isDefined(config.buildTimestampInName) ? config.buildTimestampInName : true,
  createChangelog: isDefined(config.createChangelog) ? config.createChangelog : true,
  changelogFolder: isDefined(config.changelogFolder) ? config.changelogFolder : './changelogs',
  commitURL: isDefined(config.commitURL) ? config.commitURL : false,
  releaseURL: isDefined(config.releaseURL) ? config.releaseURL : false,
  userPackage: packageDefinitionPath,
  packageSpaces: isDefined(config.packageSpaces) ? config.packageSpaces : 2,
  preConditionCommands: isDefined(config.preConditionCommands) ? config.preConditionCommands : [],
  neverendingChangelog: isDefined(config.neverendingChangelog) ? config.neverendingChangelog : false,
  neverendingChangelogFilename: isDefined(config.neverendingChangelogFilename) ? config.neverendingChangelogFilename : 'CHANGELOG.md'
};

function showHelp() {
    console.log();
    console.log('build-helper');
    console.log();
    console.log('create a new release, update the version and build number and do the git stuff');
    console.log('build-helper 0.0.5');
    console.log('build-helper major|minor|patch');
    console.log('build-helper -p minor');
    console.log('build-helper --debug -p patch')
    console.log();
    console.log('Usage: build-helper');
    console.log();
    console.log('  options');
    console.log('   -h/--help     show this help');
    console.log('   -p/--push     push new release to origin');
    console.log('   -k/--keep     keep branch after performing finish');
    console.log('   -d/--debug    more output');
    console.log('   -u/--update   (BETA) experimental');
    console.log();
}

if (process.argv.length > 2) {
  var end = false;
  paramaters = process.argv.splice(2);
  paramaters.forEach(function(parameter) {
    switch (parameter) {
      case '-h':
      case '--help':
        showHelp();
        end = true;
        break;
      case '-d':
      case '--debug':
        options.debug = true;
        break;
      case '-p':
      case '--push':
        options.push = true;
        break;
      case '-k':
      case '--keep':
        options.keep = true;
        break;
      case '-u':
      case '--update':
        options.update = true;
        break;
    }
  });
  if (end) {
    process.exit(0);
  }
} else {
  showHelp();
  process.exit(1);
}
if (options.update) {
  parameterVersion = userPackage.version;
  if (packageDefinitionPath) {
    console.log('version ' + parameterVersion + ' taken from package file ' + packageDefinitionPath);
  } else {
    console.log('version ' + parameterVersion + ' taken from tags');
  }
} else {
  parameterVersion = paramaters[paramaters.length-1];
  if (parameterVersion.indexOf('.') > -1) {
    parameterVersion = semver.clean(parameterVersion);
  }
  if (semver.valid(parameterVersion) === null && parameterVersion !== 'patch' && parameterVersion !== 'major' && parameterVersion !== 'minor') {
    console.log(chalk.red('invalid version parameter'));
    process.exit(1);
  }
}

if (typeof parameterVersion === 'undefined') {
  showHelp();
  process.exit(1);
}

var helper = new Helper(extend({}, options, {
    currentVersion: userPackage.version,
    parameterVersion: parameterVersion,
    packageStatus: userPackage.status,
    packageName: userPackage.name
}));
helper.bump();
helper.createBranchName();
helper.release();


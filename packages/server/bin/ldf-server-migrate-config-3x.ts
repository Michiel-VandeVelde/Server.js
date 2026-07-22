/* Migrates an LDF server config file to the new 3.x.x format. */
import * as fs from 'fs';

let args = process.argv.slice(2);
if (!(args.length === 1 || (args.length === 2 && args[1] === '--apply'))) {
  process.stdout.write('usage: ldf-server-migrate-config-3x config.json [--apply]\n');
  process.stdout.write('         Migrates an LDF server config file to the new 3.x.x format.\n');
  process.exit(1);
}

migrateConfig(args[0], args[1] === '--apply');

// The old (2.x, flat JSON) and new (3.x, ComponentsJS) config shapes are both loosely-structured
// JSON that this script progressively reshapes in place (deleting old fields, adding new ones on
// the same object) — a rigid interface per intermediate shape would fight the script's own logic
// more than it would help, so both stay a plain untyped JSON bag.
function migrateConfig(configFile: string, updateFile: boolean) {
  const configDefaults = {
    '@context': 'https://linkedsoftwaredependencies.org/bundles/npm/@ldf/server/^3.0.0/components/context.jsonld',
    '@id': 'urn:ldf-server:my',
    'import': 'preset-qpf:config-defaults.json',
  };

  const configOld: Record<string, any> = JSON.parse(fs.readFileSync(configFile).toString());
  let config: Record<string, any> = configOld;

  if ('@context' in configOld) {
    process.stderr.write('The config file already appears to be updated to 3.x.x, aborting.\n');
    process.exit(1);
  }

  // Add pre-amble
  config = { ...configDefaults, ...config };

  // Convert Memento
  if ('timegates' in config) {
    const timegatesOld = config.timegates;
    if ('baseURL' in timegatesOld)
      config.timegateBaseUrl = timegatesOld.baseURL;
    delete config.timegates;
    const mementos: any[] = [];
    for (const timegatePath in timegatesOld.mementos) {
      const memento = timegatesOld.mementos[timegatePath];
      const versions: any[] = [];
      for (const datasourceId of memento.versions) {
        const mementoInterval = config.datasources[datasourceId].memento.interval;
        versions.push({
          mementoDatasource: datasourcePathToId(datasourceId),
          versionStart: mementoInterval[0],
          versionEnd: mementoInterval[1],
          ... memento.originalBaseURL ? { mementoBaseURL: memento.originalBaseURL } : {},
        });
      }
      mementos.push({ timegatePath, versions });
    }
    config.mementos = mementos;
  }

  // Convert datasources
  if ('datasources' in config) {
    const datasourcesOld = config.datasources;
    const datasourcesNew: any[] = [];
    for (const datasourcePath in datasourcesOld) {
      const datasourceOld = datasourcesOld[datasourcePath];

      const settingsOld = datasourceOld.settings;
      const settings: any = {};
      if (settingsOld) {
        if ('endpoint' in settingsOld) settings.sparqlEndpoint = settingsOld.endpoint;
        if ('file' in settingsOld && datasourceOld.type !== 'HdtDatasource') settings.file = settingsOld.file;
        if ('file' in settingsOld && datasourceOld.type === 'HdtDatasource') settings.hdtFile = settingsOld.file;
        if ('references' in settingsOld) settings.compose = settingsOld.references.map(datasourcePathToId);
      }

      datasourcesNew.push({
        '@id': datasourcePathToId(datasourcePath),
        '@type': datasourceOld.type,
        'quads': false, // QPF did not exist before 3.x, so ensure the existing datasources keep their current semantics
        'datasourcePath': datasourcePath,
        'datasourceTitle': datasourceOld.title,
        ... datasourceOld.description ? { description: datasourceOld.description } : {},
        ... datasourceOld.license ? { license: datasourceOld.license } : {},
        ... datasourceOld.licenseUrl ? { licenseUrl: datasourceOld.licenseUrl } : {},
        ... datasourceOld.copyright ? { copyright: datasourceOld.copyright } : {},
        ... datasourceOld.homepage ? { homepage: datasourceOld.homepage } : {},
        ... ('hide' in datasourceOld) ? { hide: datasourceOld.hide } : {},
        ... ('enabled' in datasourceOld) ? { enabled: datasourceOld.enabled } : {},
        ... settings,
      });
    }
    config.datasources = datasourcesNew;
  }

  // Convert prefixes
  if ('prefixes' in config) {
    const prefixesOld = config.prefixes;
    const prefixesNew: any[] = [];
    for (const prefix in prefixesOld)
      prefixesNew.push({ prefix, uri: prefixesOld[prefix] });
    config.prefixes = prefixesNew;
  }

  // Convert dereference
  if ('dereference' in config) {
    const dereferenceOld = config.dereference;
    const dereferenceNew: any[] = [];
    for (const dereferencePath in dereferenceOld)
      dereferenceNew.push({ dereferenceDatasource: datasourcePathToId(dereferenceOld[dereferencePath]), dereferencePath });
    config.dereference = dereferenceNew;
  }

  // Convert logging
  if ('logging' in config) {
    const loggingOld = config.logging;
    config.logging = 'enabled' in loggingOld ? loggingOld.enabled : true;
    config.loggingFile = loggingOld.file;
  }

  // Convert SSL
  if ('ssl' in config) {
    const keys = config.ssl.keys;
    config.sslKey = keys.key;
    config.sslCert = keys.cert;
    config.sslCa = keys.ca;
    delete config.ssl;
  }

  // Convert response headers
  if ('response' in config) {
    const headersOld = config.response.headers;
    delete config.response;
    const headersNew: any[] = [];
    for (const headerName in headersOld)
      headersNew.push({ headerName, headerValue: headersOld[headerName] });
    config.responseHeaders = headersNew;
  }

  // Convert Routers, Controllers and Views
  if ('routers' in config || 'controllers' in config || 'views' in config) {
    process.stderr.write('Custom routers, controllers and views are not supported by this tool, they have been omitted from the config.\n');
    process.stderr.write('Please refer to the documentation: https://github.com/LinkedDataFragments/Server.js/tree/master/packages/core/README.md\n');
    delete config.routers;
    delete config.controllers;
    delete config.views;
  }

  if (updateFile) {
    const configFileBack = configFile + '.back';
    if (fs.existsSync(configFileBack)) {
      process.stderr.write(`The backup file ${configFileBack} already exists, aborting.\n`);
      process.exit(1);
    }
    fs.writeFileSync(configFileBack, JSON.stringify(configOld, null, '  '));
    fs.writeFileSync(configFile, JSON.stringify(config, null, '  '));
    process.stderr.write(`Config file has been successfully updated at ${configFile}\n`);
  }
  else
    process.stdout.write(JSON.stringify(config, null, '  ') + '\n');
}

function datasourcePathToId(datasourcePath: string) {
  return 'urn:ldf-server:myDatasource' + datasourcePath;
}

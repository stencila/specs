const { src, dest, parallel, series, watch } = require('gulp')
const Ajv = require('ajv')
const betterAjvErrors = require('better-ajv-errors')
const del = require('del')
const fs = require('fs-extra')
const jls = require('vscode-json-languageservice')
const jstt = require('json-schema-to-typescript')
const path = require('path')
const refParser = require('json-schema-ref-parser')
const rename = require('gulp-rename')
const through2 = require('through2')
const yaml = require('js-yaml')

/**
 * Generate `dist/*.schema.json` files from `schema/*.schema.{yaml,json}` files
 */
function jsonschema() {
  return src('schema/*.schema.{yaml,json}')
    .pipe(
      through2.obj((file, enc, cb) => {
        // Load YAML...
        const schema = yaml.safeLoad(file.contents)
        // Replace any `$ref`s to YAML to the JSOn (which will be
        // in turn generated by this)
        function walk(node) {
          if (typeof node !== 'object') return
          for (let [key, child] of Object.entries(node)) {
            if (key === '$ref' && typeof child === 'string')
              node[key] = child.replace('.yaml', '.json')
            walk(child)
          }
        }
        walk(schema)
        // Convert to JSON
        file.contents = Buffer.from(JSON.stringify(schema, null, '  '))

        cb(null, file)
      })
    )
    .pipe(rename({ extname: '.json' }))
    .pipe(dest('dist/'))
}

/**
 * Generate a JSON-LD `@context` from the `dist/*.schema.json` files
 *
 * Generates a `@context` similar to https://github.com/codemeta/codemeta/blob/master/codemeta.jsonld
 * but with any extension class or properties defined using `Class` or `Property` (see using https://meta.schema.org/).
 */
function jsonld() {
  const types = {}
  const properties = {}

  // Process each JSON file
  return (
    src('dist/*.schema.json')
      .pipe(
        through2.obj((file, enc, cb) => {
          const schema = JSON.parse(file.contents)

          // Create a schema.org [`Class`](https://meta.schema.org/Class) for those
          // classes that are defined by this schema, otherwise link to source.
          const cid = schema['@id']
          if (cid) {
            if (cid.startsWith('stencila:')) {
              types[schema.title] = {
                '@id': cid,
                '@type': 'schema:Class',
                'schema:name': schema.title,
                'schema:description': schema.description
              }
            } else {
              types[schema.title] = {
                '@id': cid
              }
            }
          } else {
            console.error(`Warning: @id is not defined at the top level in ${file.path}`)
          }

          // Create a [`Property`](https://meta.schema.org/Property)
          // TODO: Implement schema:rangeIncludes property - requires the
          // resolving `$refs`. See https://github.com/epoberezkin/ajv/issues/125#issuecomment-408960384
          // for an approach to that.
          const typeProperties = schema.properties || (schema.allOf && schema.allOf[1] && schema.allOf[1].properties)
          if (typeProperties) {
            for (let [name, property] of Object.entries(typeProperties)) {
              const pid = property['@id']
              if (!pid) continue
              if (pid.startsWith('stencila:')) {
                if (!properties[name]) {
                  properties[name] = {
                    '@id': pid,
                    '@type': 'schema:Property',
                    'schema:name': name,
                    'schema:description': property.description,
                    'schema:domainIncludes': [{ '@id': cid }]
                  }
                } else {
                  if (properties[name]['@id'] !== pid) {
                    throw new Error(`Property "${name}" has more than one @id "${properties[name]['@id']}" and "${pid}"`)
                  }
                  properties[name]['schema:domainIncludes'].push({ '@id': cid })
                }
              } else {
                properties[name] = {
                  '@id': pid
                }
              }
            }
          }

          cb(null, file)
        })
      )
      // Sigh. To make this a writeable stream so the 'end' works
      // https://github.com/gulpjs/gulp/issues/1637#issuecomment-216958503
      .on('data', () => {})
      // Now write the context
      .on('end', () => {
        const jsonld = {
          '@context': {
            // Contexts referred to, including this one
            schema: 'https://schema.org/',
            bioschemas: 'http://bioschemas.org',
            codemeta: 'https://doi.org/10.5063/schema/codemeta-2.0',
            stencila: 'https://stencila.github.io/schema/01-draft',

            // Alias `@type` and `@id`
            // See "Addressing the “@” issue" at https://datalanguage.com/news/publishing-json-ld-for-developers
            // for why this is useful.
            type: '@type',
            id: '@id'
          }
        }
        // Add types and properties alphabetically
        for (let [key, value] of [
          ...[...Object.entries(types)].sort(),
          ...[...Object.entries(properties)].sort()
        ])
          jsonld[key] = value
        fs.writeJSONSync(path.join('dist', 'schema.jsonld'), jsonld, {
          spaces: 2
        })
      })
  )
}

/**
 * Generate `dist/index.d.ts` from `schema/index.schema.json`
 */
async function typescript() {
  const src = 'dist/index.schema.json'
  const dest = 'dist/index.d.ts'
  const options = {
    bannerComment: `/* tslint:disable */
/**
 * This file was automatically generated.
 * Do not modify it by hand. Instead, modify the source \`.schema.yaml\` file
 * in the \`schema\` directory and run \`npm run build\`
 * to regenerate this file.
 */`
  }
  const ts = await jstt.compileFromFile(src, options)
  fs.writeFileSync(dest, ts)
}

/**
 * Check the generated JSON Schemas in `dist/*.schema.json` are valid.
 */
async function check() {
  const schema = await fs.readJSON('dist/index.schema.json')
  const metaSchema = require('ajv/lib/refs/json-schema-draft-07.json')
  const ajv = new Ajv({ jsonPointers: true })
  const validate = ajv.compile(metaSchema)
  if (!validate(schema)) {
    const message = betterAjvErrors(metaSchema, schema, validate.errors, {
      format: 'cli',
      indent: 2
    })
    console.log(message)
    throw new Error('💣  Oh, oh, the schema is invalid')
  }
}

/**
 * Test that the examples are valid
 */
function test() {
  const ajv = new Ajv({
    jsonPointers: true,
    allErrors: true,
    loadSchema: uri => {
      const match = uri.match(/https:\/\/stencila.github.com\/schema\/(.+)$/)
      if (!match) throw new Error(`Not able to get schema from URI "${uri}"`)
      return fs.readJSON(path.join('dist', match[1]))
    }
  })

  return src('examples/**/*.{yaml,json}').pipe(
    through2.obj((file, enc, cb) => {
      ;(async function() {
        const example = yaml.safeLoad(file.contents)
        if (!example) throw new Error(`Example seems to be empty: ${file.path}`)

        const type = example.type
        if (!type)
          throw new Error(
            `Example does not have a "type" property: ${file.path}`
          )
        let validator = ajv.getSchema(
          `https://stencila.github.com/schema/${type}.schema.json`
        )
        if (!validator) {
          let schema = await fs.readJSON(
            path.join('dist', type + '.schema.json')
          )
          validator = await ajv.compileAsync(schema)
        }

        const valid = validator(example)
        const relativePath = path.relative(process.cwd(), file.path)
        if (file.basename.includes('invalid')) {
          if (valid) {
            throw new Error(
              `? Woops. "${relativePath}" is supposed to be invalid, but it's not.`
            )
          } else {
            const contents = file.contents.toString()

            // All validation errors should have a corresponding comment in the file
            // Previously we used:
            //    const errors = betterAjvErrors(schema, example, validator.errors, { format: 'json'})
            // to generate the list of errors. However despite the use of `allErrors: true` above, Ajv
            // does not always return all errors (because it is optimimised for speed?). So instead, here we
            // use the vscode JSON language service to generate a list of errors.
            const json = JSON.stringify(yaml.safeLoad(contents))
            const textDoc = jls.TextDocument.create(
              'foo://bar/file.json',
              'json',
              0,
              json
            )
            const jsonDoc = jls
              .getLanguageService({})
              .parseJSONDocument(textDoc)
            const errors = jsonDoc.validate(textDoc, validator.schema)

            for (let error of errors) {
              if (!contents.includes(error.message)) {
                throw new Error(
                  `💣  Oh, oh, "${relativePath}" is expected to contain the comment "${
                    error.message
                  }".`
                )
              }
            }
          }
        } else {
          if (!valid) {
            const message = betterAjvErrors(
              validator.schema,
              example,
              validator.errors,
              {
                format: 'cli',
                indent: 2
              }
            )
            console.log(message)
            throw new Error(`💣  Oh, oh, "${relativePath}" is invalid`)
          }
        }
      })()
        .then(() => cb(null))
        .catch(error => cb(error))
    })
  )
}

/**
 * Clean up!
 */
function clean() {
  return del('dist')
}

exports.jsonschema = jsonschema
exports.check = series(jsonschema, check)
exports.jsonld = series(jsonschema, jsonld)
exports.typescript = series(jsonschema, typescript)
exports.test = series(jsonschema, test)
exports.build = series(
  clean,
  jsonschema,
  parallel(check, test),
  parallel(jsonld, typescript)
)
exports.watch = () =>
  watch(['schema/*', 'examples'], { ignoreInitial: false }, exports.build)
exports.clean = clean

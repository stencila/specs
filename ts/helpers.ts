/**
 * A module providing helper functions that are useful when
 * generating languages bindings and documentation.
 */

import fs from 'fs-extra'
import globby from 'globby'
import path from 'path'
import toposort from 'toposort'
import Schema from './schema-interface'
export { default as Schema } from './schema-interface'

/**
 * Read the schemas from `public/*.schema.json`.
 */
export async function readSchemas(
  glob: string = path.join(__dirname, '..', 'public', '*.schema.json')
): Promise<Schema[]> {
  // Read in the schemas
  const files = await globby(glob)
  return Promise.all(
    files.map(async (file: string): Promise<Schema> => fs.readJSON(file))
  )
}

/**
 * Get the 'type' schemas (i.e. not union schema, not property schemas) which are
 * usually translated into classes or similar for the language.
 *
 * Types are sorted topologically so that schemas come before
 * any of their descendants.
 */
export function filterTypeSchemas(schemas: Schema[]): Schema[] {
  const types = schemas.filter(schema => schema.properties !== undefined)
  const map = new Map(schemas.map(schema => [schema.title, schema]))

  const edges = types.map((schema): [string, string] => [
    schema.extends !== undefined ? schema.extends : '',
    schema.title !== undefined ? schema.title : ''
  ])
  const ordered = toposort(edges).filter(title => title !== '')

  return ordered.map(title => {
    const schema = map.get(title)
    if (schema === undefined)
      throw new Error(`Holy smokes, "${title}" aint in da map @#!&??!`)
    return schema
  })
}

/**
 * Get the union types from the schemas
 */
export function filterUnionSchemas(schemas: Schema[]): Schema[] {
  return schemas.filter(schema => schema.anyOf !== undefined)
}

/**
 * Interface for properties giving a little
 * more information on each property to be used in code generation
 */
interface Property {
  name: string
  schema: Schema
  inherited: boolean
  override: boolean
  optional: boolean
}

/**
 * Get properties for a schema.
 *
 * Properties are arranged in groups according to required (or not)
 * and inherited (or not).
 */
export function getSchemaProperties(
  schema: Schema
): {
  all: Property[]
  inherited: Property[]
  own: Property[]
  required: Property[]
  optional: Property[]
} {
  const { title, properties = {}, required = [] } = schema

  const props = Object.entries(properties)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    .filter(([name, _]) => name !== 'type')
    .map(
      ([name, schema]): Property => {
        const { from, override = false } = schema
        const inherited = from !== title
        const optional = required === undefined || !required.includes(name)
        return { name, schema, inherited, override, optional }
      }
    )
    .sort((a, b) => {
      if (a.optional === b.optional) {
        if (a.name === b.name) return 0
        if (a.name < b.name) return -1
        return 1
      }
      if (a.optional) return 1
      return -1
    })

  return {
    all: props,
    inherited: props.filter(prop => prop.inherited),
    own: props.filter(prop => !prop.inherited || prop.override),
    required: props.filter(prop => !prop.optional),
    optional: props.filter(prop => prop.optional)
  }
}

/**
 * Create a header for a language bindings file
 */
export function autogeneratedHeader(
  generateCommand: string,
  generator: string,
  commentDelimiter: string
): string {
  return `${commentDelimiter} This file was automatically generated by \`${generator}\`.
${commentDelimiter} Do not modify it by hand. Instead, modify the source \`.schema.yaml\` files
${commentDelimiter} in the \`schema\` directory and run \`npm run ${generateCommand}\` to regenerate it.`
}
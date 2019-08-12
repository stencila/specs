import {build} from '../schema'

/**
 * Global setup run before any tests
 */
export default async function setup() {
  await build()
}

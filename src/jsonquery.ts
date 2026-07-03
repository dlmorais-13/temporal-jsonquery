import { compile } from './compile'
import { setStateIsTemporal } from './functions'
import { isString } from './is'
import { parse } from './parse'
import type { JSONQuery, JSONQueryOptions } from './types'

export function jsonquery(
  data: unknown,
  query: string | JSONQuery,
  options?: JSONQueryOptions
): unknown {
  setStateIsTemporal(false)
  return compile(isString(query) ? parse(query, options) : query, options)(data)
}

export { compile } from './compile'
export { stringify } from './stringify'
export { parse } from './parse'
export { buildFunction } from './functions'

export const ValueTypes = Object.freeze({
  OBJECT: 0,
  ARRAY: 1,
  STRING: 2,
  NUMBER: 3,
  NULL: 4
})

export type {
  CustomOperator,
  Fun,
  FunctionBuilder,
  FunctionBuildersMap,
  JSONPath,
  JSONProperty,
  JSONQuery,
  JSONQueryCompileOptions,
  JSONQueryFunction,
  JSONQueryObject,
  JSONQueryOptions,
  JSONQueryParseOptions,
  JSONQueryPrimitive,
  JSONQueryProperty,
  JSONQueryPipe,
  JSONQueryStringifyOptions
} from './types'

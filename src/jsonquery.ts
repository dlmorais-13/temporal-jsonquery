import { compile } from './compile'
import { setStateIsTemporal } from './functions'
import { isString } from './is'
import { parse } from './parse'
import { type JSONQuery, type JSONQueryOptions } from './types'

export function jsonquery(
  data: unknown,
  query: string | JSONQuery,
  options?: JSONQueryOptions,
  isTemporal: boolean = false
): unknown {
  setStateIsTemporal(isTemporal)
  return compile(isString(query) ? parse(query, options) : query, options)(data)
}

export { compile } from './compile'
export { stringify } from './stringify'
export { parse } from './parse'
export { buildFunction } from './functions'
export { convertToTemporal, convertToNonTemporal } from './temporalConvert'
export { ValueTypes } from './types'

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

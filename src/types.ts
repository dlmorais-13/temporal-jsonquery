export type JSONQueryFunction = [name: string, ...args: JSONQuery[]]
export type JSONQueryObject = { [key: string]: JSONQuery }
export type JSONQueryPrimitive = string | number | boolean | null
export type JSONQuery = JSONQueryFunction | JSONQueryObject | JSONQueryPrimitive

export type JSONProperty = string
export type JSONPath = JSONProperty[]
export type JSONQueryProperty = ['get', ...path: JSONPath]
export type JSONQueryPipe = ['pipe', ...JSONQuery[]]

export type Timestamp = [number, number]

export enum ValueTypes {
  OBJECT,
  ARRAY,
  STRING,
  NUMBER,
  BOOLEAN,
  NULL
}

type ValueTypeMap = {
  [ValueTypes.OBJECT]: Array<string>,
  [ValueTypes.ARRAY]: Array<number>,
  [ValueTypes.STRING]: string,
  [ValueTypes.NUMBER]: number,
  [ValueTypes.BOOLEAN]: boolean,
  [ValueTypes.NULL]: null
}

export type TemporalVersion<T extends ValueTypes = ValueTypes> = {
  [K in T]: [K, [number | null, number | null], ValueTypeMap[K]]
}[T]

const a: TemporalVersion<ValueTypes.STRING> = [ValueTypes.STRING, [1,2], '']

export type TemporalData<T extends ValueTypes> = {
  versions: Array<TemporalVersion<T>>,
  data?: Record<string, TemporalData<ValueTypes>>
}

export interface JSONQueryOptions {
  functions?: FunctionBuildersMap
  operators?: CustomOperator[]
}

export interface JSONQueryCompileOptions {
  functions?: FunctionBuildersMap
}

export interface JSONQueryStringifyOptions {
  operators?: CustomOperator[]
  maxLineLength?: number
  indentation?: string
}

export interface JSONQueryParseOptions {
  operators?: CustomOperator[]
}

export type Fun = (data: unknown) => unknown
export type FunctionBuilder = (...args: JSONQuery[]) => Fun
export type FunctionBuildersMap = Record<string, FunctionBuilder>
export type Getter = [key: string, Fun]
export type OperatorGroup = Record<string, string>
export type CustomOperator =
  | { name: string; op: string; at: string; vararg?: boolean; leftAssociative?: boolean }
  | { name: string; op: string; after: string; vararg?: boolean; leftAssociative?: boolean }
  | { name: string; op: string; before: string; vararg?: boolean; leftAssociative?: boolean }

export interface Entry<T> {
  key: string
  value: T
}

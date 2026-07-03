import { compile } from './compile'
import { getSafeProperty, getSafePropertyTemporal, isArray, isObject, isEqual as _isEqual } from './is'
import type {
  Entry,
  FunctionBuilder,
  FunctionBuildersMap,
  Getter,
  JSONPath,
  JSONQuery,
  JSONQueryFunction,
  JSONQueryObject,
  JSONQueryProperty,
  Timestamp
} from './types'
import { ValueTypes } from "./jsonquery";

export function buildFunction(fn: (...args: unknown[]) => unknown): FunctionBuilder {
  return (...args: JSONQuery[]) => {
    const compiledArgs = args.map((arg) => compile(arg))

    const arg0 = compiledArgs[0]
    const arg1 = compiledArgs[1]

    return compiledArgs.length === 1
      ? (data: unknown) => fn(arg0(data))
      : compiledArgs.length === 2
        ? (data: unknown) => fn(arg0(data), arg1(data))
        : (data: unknown) => fn(...compiledArgs.map((arg) => arg(data)))
  }
}

var stateIsTemporal = false
export const setStateIsTemporal = (value) => stateIsTemporal = value;
const AllOfTime = [1, 100]
var lifetimes = [AllOfTime]

type version<T> = [number, [number, number], T]

type temporalData<T> = {
  versions: Array<version<T>>,
  data?: Record<string, temporalData<unknown>>
}

const sortableTypes = { boolean: 0, number: 1, string: 2 }
const otherTypes = 3

const gt = (a: unknown, b: unknown) => {
  if (stateIsTemporal) {
    if (!isObject(a)) return _gt(a, b)
    return temporalBinaryBooleanOperation(a as temporalData<unknown>, b, _gt)
  } else {
    return _gt(a, b)
  }
}

const _gt = (a: unknown, b: unknown) => {
  return typeof a === typeof b && (typeof a) in sortableTypes ? a > b : false
}

const isEqual = <T>(a: T | temporalData<T>, b: T): boolean => {
  if (stateIsTemporal) {
    if (!isObject(a)) return _isEqual(a, b)
    return temporalBinaryBooleanOperation(a as temporalData<T>, b, _isEqual)
  } else {
    return _isEqual(a, b);
  }
}

// Execute the function with temporal semantics, using function f
const temporalBinaryBooleanOperation = <T>(a: temporalData<T>, b: temporalData<T> | T, f: Function): boolean => {
  var aValue: T
  var bValue: T
  // var aVersion = []
  // var bVersion = []
  var aType = 0
  var bType = 0
  var aTimestamp = []
  var bTimestamp = []

  const newVersions = []
  if (!isObject(a)) throwTemporalObjectExpected()
  // if (!isObject(b)) throwTemporalObjectExpected()

  const bIsTemporal = isObject(b);

  for (const aVersion of a["versions"]) {
    aType = aVersion[0]
    aTimestamp = aVersion[1]
    aValue = aVersion[2]

    if (bIsTemporal) {
      for (const bVersion of b["versions"]) {
        bType = bVersion[0]
        bTimestamp = bVersion[1]
        bValue = bVersion[2]

        if (aType == bType && (aType == ValueTypes.NUMBER || aType == ValueTypes.STRING)) {
          if (f(aValue, bValue)) {

            // Create new version
            // push new version
            const newStart = Math.max(aTimestamp[0], bTimestamp[0])
            const newEnd = Math.min(aTimestamp[1], bTimestamp[1])
            if (newEnd >= newStart) {
              const newVersion = [aType, [newStart, newEnd], aValue]
              newVersions.push(newVersion)
            }
          } // otherwise do nothing
        } else {
          // Do nothing, types are wrong so path expression didn't get the correct thing
        }
      }
    } else {
      if (f(aValue, b)) {
        // Create and push new version
        newVersions.push([aType, aTimestamp, aValue])
      }
    }
  }

  // Construct or return new versions or empty list
  return newVersions.length > 0
}

const gte = (a: unknown, b: unknown) => isEqual(a, b) || gt(a, b)

const lt = (a: unknown, b: unknown) =>
  typeof a === typeof b && (typeof a) in sortableTypes ? a < b : false

const lte = (a: unknown, b: unknown) => isEqual(a, b) || lt(a, b)

function contains(a: number[], b: number[]) {
  return a[0] <= b[0] && a[1] >= b[1]
}

function checkTimestamp(object: temporalData<unknown> | version<unknown>) {
  const versions = !isArray(object) ? getSafeProperty(object, "versions") : [object]
  const newLifetimes = []
  for (const version of (versions as Array<Array<number[]>>)) {
    for (const lifetime of lifetimes) {
      const timestamp = version[1]

      if (contains(lifetime, timestamp)) {
        newLifetimes.push(timestamp)
      }
    }
  }
  return newLifetimes
}

export const functions: FunctionBuildersMap = {
  // Temporal functions
  timeSlice: (...items: Timestamp) => {
    // Changes semantics to temporal and

    stateIsTemporal = true

    return (data: unknown) => data
  },

  timeSnapshot: (...items: Timestamp) => {
    stateIsTemporal = false
    // Change semantics to snapshot/non-temporal and process data to slice at a time
    return (data: unknown) => data
  },

  sequenced: () => {
    // Identify function, but changes temporal semantics to temporal
    stateIsTemporal = true
    return (data: unknown) => data
  },

  pipe: (...entries: JSONQuery[]) => {
    const _entries = entries.map((entry) => compile(entry))

    return (data: unknown) => _entries.reduce((data, evaluator) => evaluator(data), data)
  },

  object: (query: JSONQueryObject) => {
    const getters: Getter[] = Object.keys(query).map((key) => [key, compile(query[key])])

    return (data: unknown) => {
      const obj = {}
      for (const [key, getter] of getters) {
        obj[key] = getter(data)
      }
      return obj
    }
  },

  array: (...items: JSONQuery[]) => {
    const _items = items.map((entry: JSONQuery) => compile(entry))

    return (data: unknown) => _items.map((item) => item(data))
  },

  get: (...path: JSONPath) => {
    // Push a "data" into each name in a path
    // Still have to figure out what to do with an array get
    if (stateIsTemporal) {
      const newPath = []
      for (const prop of path) {
        newPath.push("data")
        newPath.push(prop)
      }
      path = newPath
    }

    // We could reuse the get function here, but let's just duplicate the code for now
    if (path.length === 0) {
      return (data: unknown) => data ?? null
    }

    if (path.length === 1) {
      // console.log("path is 1")
      const prop = path[0]
      return stateIsTemporal ?
        (data: unknown) => {
          const times = checkTimestamp(data as temporalData<unknown>)
          return times.length > 0 ? getSafePropertyTemporal(data, prop) ?? null : null
        }
        : (data: unknown) => getSafeProperty(data, prop) ?? null
    }

    return (data: unknown) => {
      let value = data

      for (const prop of path) {
        value = getSafeProperty(value, prop)
      }

      return value ?? null
    }

  },

  map: <T>(callback: JSONQuery) => {
    const _callback = compile(callback)

    return (data: T[]) => data.map(_callback)
  },

  mapTemporal: <T>(callback: JSONQuery) => {
    const _callback = compile(callback)

    // The array is mapped to versions
    // For each version do the map by applying to the data
    // The callback should access each data value
    return (data: T[]) => data.map(_callback)
  },

  mapObject: <T, U>(callback: JSONQuery) => {
    const _callback = compile(callback)

    return (data: Record<string, T>) => {
      const output = {}
      for (const key of Object.keys(data)) {
        const updated = _callback({ key, value: data[key] }) as Entry<U>
        output[updated.key] = updated.value
      }
      return output
    }
  },

  mapKeys: <T>(callback: JSONQuery) => {
    const _callback = compile(callback)

    return (data: Record<string, T>) => {
      const output = {}
      for (const key of Object.keys(data)) {
        const updatedKey = _callback(key) as string
        output[updatedKey] = data[key]
      }
      return output
    }
  },

  mapValues: <T>(callback: JSONQuery) => {
    const _callback = compile(callback)

    return (data: Record<string, T>) => {
      const output = {}
      for (const key of Object.keys(data)) {
        output[key] = _callback(data[key])
      }
      return output
    }
  },

  filter: <T>(predicate: JSONQuery) => {
    if (stateIsTemporal) {
      const _predicate = compile(predicate)
      return (d) => {
        const filtered = { "versions": [], "data": {} };

        for (let v of d["versions"]) {
          if (v[0] !== ValueTypes.ARRAY)
            throwArrayExpected()

          const times = checkTimestamp(v)
          if (times.length) {
            const vData = v[2]
              .map(vIdx => [vIdx, d["data"][vIdx]])
              .filter(idxAndItem => truthy(_predicate(idxAndItem[1])))

            if (vData.length) {
              filtered.versions.push([ValueTypes.ARRAY, v[1], vData.map(idxAndItem => idxAndItem[0])])
              vData.forEach(idxAndItem => filtered.data[idxAndItem[0]] = idxAndItem[1])
            }
          }
        }

        return filtered.versions.length ? filtered : []
      }
    } else {
      const _predicate = compile(predicate)
      return (data: T[]) => data.filter((item) => truthy(_predicate(item)))
    }
  },

  sort: <T>(path: JSONQueryProperty = ['get'], direction?: 'asc' | 'desc') => {
    const getter = compile(path)
    const sign = direction === 'desc' ? -1 : 1

    function compare(itemA: unknown, itemB: unknown) {
      const a = getter(itemA)
      const b = getter(itemB)

      // Order mixed types
      if (typeof a !== typeof b) {
        const aIndex = sortableTypes[typeof a] ?? otherTypes
        const bIndex = sortableTypes[typeof b] ?? otherTypes

        return aIndex > bIndex ? sign : aIndex < bIndex ? -sign : 0
      }

      // Order two numbers, two strings, or two booleans
      if ((typeof a) in sortableTypes) {
        return a > b ? sign : a < b ? -sign : 0
      }

      // Leave arrays, objects, and unknown types ordered as is
      return 0
    }

    return (data: T[]) => data.slice().sort(compare)
  },

  reverse:
    <T>() =>
      (data: T[]) =>
        data.toReversed(),

  pick: (...properties: JSONQueryProperty[]) => {
    const getters = properties.map(
      ([_get, ...path]) => [path[path.length - 1], functions.get(...path)] as Getter
    )

    const _pick = (object: Record<string, unknown>, getters: Getter[]): unknown => {
      const out = {}
      for (const [key, getter] of getters) {
        out[key] = getter(object)
      }
      return out
    }

    return (data: Record<string, unknown> | temporalData<unknown>): unknown => {
      if (stateIsTemporal) {
        if (data.versions[0][0] === ValueTypes.ARRAY) {
          if (!data.versions) throwTemporalObjectExpected()
          const picked = { "versions": [], "data": {} };

          for (let v of data.versions as Array<version<unknown>>) {
            if (v[0] !== ValueTypes.ARRAY)
              throwArrayExpected()

            const times = checkTimestamp(v)
            if (times.length) {
              const vData = (v[2] as Array<string>).reduce((acc, key) => {
                acc[key] = _pick(data.data[key], getters)
                return acc
              }, {})

              if (Object.keys(vData).length) {
                picked.versions.push([ValueTypes.ARRAY, v[1], Object.keys(vData)])
                picked.data = { ...picked.data, ...vData }
              }
            }
          }

          return Object.keys(picked.data).length ? picked : []
        }

        return _pick(data.data as Record<string, unknown>, getters)
      } else {
        if (isArray(data)) {
          return data.map((item: Record<string, unknown>) => _pick(item, getters))
        }
        return _pick(data, getters)
      }
    }
  },

  /*
  pick: (...properties: JSONQueryProperty[]) => {
    const getters = properties.map(
        ([_get, ...path]) => [path[path.length - 1],
          stateIsTemporal? functions.getTemporal(...path) : functions.get(...path)] as Getter
    )

    const _pick = (object: Record<string, unknown>, getters: Getter[]): unknown => {
      const out = {}
      for (const [key, getter] of getters) {
        out[key] = getter(object)
      }
      return out
    }

    return (data: Record<string, unknown>): unknown => {
      if (isArray(data)) {
        return data.map((item: Record<string, unknown>) => _pick(item, getters))
      }

      return _pick(data, getters)
    }
  },
*/

  groupBy: <T>(path: JSONQueryProperty) => {
    const getter = compile(path)

    return (data: T[]) => {
      const res = {}

      for (const item of data) {
        const value = getter(item) as string
        if (res[value]) {
          res[value].push(item)
        } else {
          res[value] = [item]
        }
      }

      return res
    }
  },

  keyBy: <T>(path: JSONQueryProperty) => {
    const getter = compile(path)

    return (data: T[]) => {
      const res = {}

      for (const item of data) {
        const value = getter(item) as string
        if (!(value in res)) {
          res[value] = item
        }
      }

      return res
    }
  },

  flatten: () => (data: unknown[]) => data.flat(),

  join:
    <T>(separator = '') =>
      (data: T[]) =>
        data.join(separator),

  split: buildFunction((text: string, separator?: string) =>
    separator !== undefined ? text.split(separator) : text.trim().split(/\s+/)
  ),

  substring: buildFunction((text: string, start: number, end?: number) =>
    text.slice(Math.max(start, 0), end)
  ),

  uniq:
    () =>
      <T>(data: T[]) => {
        const res: T[] = []

        for (const item of data) {
          if (res.findIndex((resItem) => isEqual(resItem, item)) === -1) {
            res.push(item)
          }
        }

        return res
      },

  uniqBy:
    <T>(path: JSONQueryProperty) =>
      (data: T[]): T[] =>
        Object.values(functions.keyBy(path)(data)),

  limit:
    (count: number) =>
      <T>(data: T[]) =>
        data.slice(0, Math.max(count, 0)),

  size:
    () =>
      <T>(data: T[] | temporalData<T>) =>
        isArray(data) ? data.length : Object.values(data.data).length,

  keys: () => Object.keys,
  values: () => Object.values,

  prod: () => (data: number[]) => reduce(data, (a, b) => a * b),

  sum: () => (data: number[]) =>
    isArray(data) ? data.reduce((a, b) => a + b, 0) : throwArrayExpected(),

  average: () => (data: number[]) =>
    isArray(data)
      ? data.length > 0
        ? data.reduce((a, b) => a + b) / data.length
        : null
      : throwArrayExpected(),

  min: () => (data: number[]) => reduce(data, (a, b) => Math.min(a, b)),
  max: () => (data: number[]) => reduce(data, (a, b) => Math.max(a, b)),

  and: buildFunction((...data: unknown[]) => reduce(data, (a, b) => !!(a && b))),
  or: buildFunction((...data: unknown[]) => reduce(data, (a, b) => !!(a || b))),
  not: buildFunction((a: unknown) => !a),

  exists: (queryGet: JSONQueryFunction) => {
    const parentPath = queryGet.slice(1)
    const key = parentPath.pop()
    const getter = functions.get(...parentPath)

    return (data: unknown) => {
      const parent = getter(data)
      return !!parent && Object.hasOwnProperty.call(parent, key)
    }
  },
  if: (condition: JSONQuery, valueIfTrue: JSONQuery, valueIfFalse: JSONQuery) => {
    const _condition = compile(condition)
    const _valueIfTrue = compile(valueIfTrue)
    const _valueIfFalse = compile(valueIfFalse)

    return (data: unknown) => (truthy(_condition(data)) ? _valueIfTrue(data) : _valueIfFalse(data))
  },
  in: (value: JSONQuery, values: JSONQuery) => {
    const getValue = compile(value)
    const getValues = compile(values)

    return (data: unknown) => {
      const _value = getValue(data)
      const _values = getValues(data) as unknown[]

      return _values.findIndex((item) => isEqual(item, _value)) !== -1
    }
  },
  'not in': (value: JSONQuery, values: JSONQuery) => {
    const _in = functions.in(value, values)

    return (data: unknown) => !_in(data)
  },
  regex: (path: JSONQuery, expression: string, options?: string) => {
    const regex = new RegExp(expression, options)
    const getter = compile(path)

    return (data: unknown) => regex.test(getter(data) as string)
  },

  match: (path: JSONQuery, expression: string, options?: string) => {
    const regex = new RegExp(expression, options)
    const getter = compile(path)

    return (data: unknown) => {
      const result = (getter(data) as string).match(regex)
      return result ? matchToJSON(result) : null
    }
  },

  matchAll: (path: JSONQuery, expression: string, options?: string) => {
    const regex = new RegExp(expression, `${options ?? ''}g`)
    const getter = compile(path)

    return (data: unknown) => Array.from((getter(data) as string).matchAll(regex)).map(matchToJSON)
  },

  eq: buildFunction(isEqual),
  gt: buildFunction(gt),
  gte: buildFunction(gte),
  lt: buildFunction(lt),
  lte: buildFunction(lte),
  ne: buildFunction((a, b) => !isEqual(a, b)),

  add: buildFunction((a: number, b: number) => a + b),
  subtract: buildFunction((a: number, b: number) => a - b),
  multiply: buildFunction((a: number, b: number) => a * b),
  divide: buildFunction((a: number, b: number) => a / b),
  mod: buildFunction((a: number, b: number) => a % b),
  pow: buildFunction((a: number, b: number) => a ** b),

  abs: buildFunction(Math.abs),
  round: buildFunction((value: number, digits = 0) => {
    const num = Math.round(Number(`${value}e${digits}`))
    return Number(`${num}e${-digits}`)
  }),

  number: buildFunction((text: string) => {
    const num = Number(text)
    if (stateIsTemporal) {
      // Construct a temporal type
      return {
        "versions": [[ValueTypes.NUMBER, AllOfTime, num]],
      }
    } else {
      return Number.isNaN(Number(text)) ? null : num
    }
  }),
  string: buildFunction(String)
}

const truthy = (x: unknown) => x !== null && x !== 0 && x !== false

const reduce = <T>(data: T[], callback: (previousValue: T, currentValue: T) => T): T => {
  if (!isArray(data)) {
    throwArrayExpected()
  }

  if (data.length === 0) {
    return null
  }

  return data.reduce(callback)
}

const matchToJSON = (result: RegExpMatchArray) => {
  const [value, ...groups] = result
  const namedGroups = result.groups

  return groups.length
    ? namedGroups
      ? { value, groups, namedGroups }
      : { value, groups }
    : { value }
}

const throwTemporalObjectExpected = () => {
  throwTypeError('Temporal Object expected')
}

const throwArrayExpected = () => {
  throwTypeError('Array expected')
}

export const throwTypeError = (message: string) => {
  throw new TypeError(message)
}

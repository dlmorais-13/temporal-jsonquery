import { TemporalData, ValueTypes } from './types'

export function convertToTemporal(currentKey: string, jsonObject: unknown, operations: Array<{ path: string, value: boolean | string | number }> = []) {
  console.debug('convertToTemporal$currentKey', currentKey)
  console.debug('convertToTemporal$jsonObject', jsonObject)

  var listOfKeys = []
  var jsonData = {}
  var jsonArray = []

  if (jsonObject === null) {
    return {
      "versions": [[ValueTypes.NULL, [1, null], null]],
    }
  } else if (Array.isArray(jsonObject)) {
    Object.entries(jsonObject).forEach(([key, value]) => {
      jsonArray.push(convertToTemporal(`${currentKey}[${key}]`, value, operations))
      listOfKeys.push(key)
    })

    return {
      "versions": [[ValueTypes.ARRAY, [1, null], listOfKeys]],
      "data": jsonArray
    }
  } else if (typeof jsonObject === 'object') {
    Object.entries(jsonObject).forEach(([key, value]) => {
      jsonData[key] = convertToTemporal(`${currentKey}.${key}`, value, operations)
      listOfKeys.push(key)
    })

    return {
      "versions": [[ValueTypes.OBJECT, [1, null], listOfKeys]],
      "data": jsonData
    }
  } else if (typeof jsonObject === 'string') {
    const versions = [[ValueTypes.STRING, [1, null], jsonObject]];
    operations
      .filter(o => o.path === currentKey)
      .forEach(o => {
        const latestVersion = versions[versions.length - 1];
        latestVersion[1][1] = latestVersion[1][0];
        versions.push([ValueTypes.STRING, [latestVersion[1][1] + 1, null], o.value as string])
      });

    return { versions }
  } else if (typeof jsonObject === 'number') {
    const versions = [[ValueTypes.NUMBER, [1, null], jsonObject]];
    operations
      .filter(o => o.path === currentKey)
      .forEach(o => {
        const latestVersion = versions[versions.length - 1];
        latestVersion[1][1] = latestVersion[1][0];
        versions.push([ValueTypes.NUMBER, [latestVersion[1][1], null], o.value as number])
      });

    return { versions }
  } else if (typeof jsonObject === 'boolean') {
    const versions = [[ValueTypes.BOOLEAN, [1, null], jsonObject]];
    operations
      .filter(o => o.path === currentKey)
      .forEach(o => {
        const latestVersion = versions[versions.length - 1];
        latestVersion[1][1] = latestVersion[1][0];
        versions.push([ValueTypes.BOOLEAN, [latestVersion[1][1], null], o.value as boolean])
      });

    return { versions }
  } else {
    throw new Error(`Unknown type in JSON. Key: ${currentKey} = ${jsonObject}`);
  }
}

export function convertToNonTemporal(currentKey: string, time: number, temporalObject: TemporalData<ValueTypes>) {
  // If no time is defined, return undefined.
  if (time === undefined) {
    return undefined;
  }

  // Find the version matching the time presented.
  const version = temporalObject.versions.find(v => {
    return (v[1][0] == null || v[1][0] <= time)
      && (v[1][1] == null || v[1][1] >= time)
  });

  if (!version) return undefined;

  switch (version[0]) {
    case ValueTypes.NULL:
    case ValueTypes.STRING:
    case ValueTypes.BOOLEAN:
    case ValueTypes.NUMBER:
      return version[2];

    case ValueTypes.ARRAY:
      const array = [];
      for (let i of version[2]) {
        array.push(convertToNonTemporal(`${currentKey}[${i}]`, time, temporalObject.data[i]));
      }
      return array;

    case ValueTypes.OBJECT:
      const obj = {};
      for (let i of version[2]) {
        obj[i] = convertToNonTemporal(`${currentKey}.${i}`, time, temporalObject.data[i]);
      }
      return obj;
  }
}

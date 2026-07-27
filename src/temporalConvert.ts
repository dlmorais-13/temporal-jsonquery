import { ValueTypes } from '../lib/temporal-jsonquery.js'

export function convertToTemporal(currentKey, jsonObject) {
  var listOfKeys = []
  var jsonData = {}
  var jsonArray = []
  if (Array.isArray(jsonObject)) {
    Object.entries(jsonObject).forEach(([key, value]) => {
      jsonArray.push(convertToTemporal(key, value))
      listOfKeys.push(key)
    })
    return {
      "versions": [[ValueTypes.ARRAY, [1,1], listOfKeys]],
      "data": jsonArray
    }
    // As an object
    /*
    Object.entries(jsonObject).forEach(([key, value]) => {
      jsonData[key.toString()] = convertToTemporal(key, value)
      listOfKeys.push(key)
    })
    return {
        "versions": [[ValueTypes.ARRAY, [1,1]], listOfKeys],
        "data": jsonData
      }
     */
  } else if (typeof(jsonObject) == 'object') {
    Object.entries(jsonObject).forEach(([key, value]) => {
      jsonData[key] = convertToTemporal(key, value)
      listOfKeys.push(key)
    })
    return {
      "versions": [[ValueTypes.OBJECT, [1,1], listOfKeys]],
      "data": jsonData
    }
  } else if (typeof jsonObject === 'string') {
    return {
      "versions": [[ValueTypes.STRING, [1,1], jsonObject]],
    }
  } else if (typeof jsonObject === 'number') {
    return {
      "versions": [[ValueTypes.NUMBER, [1,1], jsonObject]],
    }
  } else {
    // value is null
    return {
      "versions": [[ValueTypes.NULL, [1,1], null]],
    }
  }
}

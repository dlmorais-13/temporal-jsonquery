import { stringifyJson } from "../stringifyJson"

const input2and3 = stringifyJson([
  { "name": "Chris", "age": 23, "city": "New York" },
  { "name": "Emily", "age": 19, "city": "Atlanta" },
  { "name": "Joe", "age": 32, "city": "New York" },
  { "name": "Kevin", "age": 19, "city": "Atlanta" },
  { "name": "Michelle", "age": 27, "city": "Los Angeles" },
  { "name": "Robert", "age": 45, "city": "Manhattan" },
  { "name": "Sarah", "age": 31, "city": "New York" }
])!;

export interface Example {
  name: string
  input: string
  query: string
  operations: string
}

export const examples: Example[] = [
  {
    name: 'example 1',
    input: stringifyJson({
      "friends": [
        { "name": "Chris", "age": 23, "city": "New York" },
        { "name": "Emily", "age": 19, "city": "Atlanta" },
        { "name": "Joe", "age": 32, "city": "New York" },
        { "name": "Kevin", "age": 19, "city": "Atlanta" },
        { "name": "Michelle", "age": 27, "city": "Los Angeles" },
        { "name": "Robert", "age": 45, "city": "Manhattan" },
        { "name": "Sarah", "age": 31, "city": "New York" }
      ]
    })!,
    operations: stringifyJson([])!,
    query: `.friends
  | filter(.city == "New York")
  | sort(.age)
  | pick(.name, .age)`
  },
  {
    name: 'example 2',
    input: input2and3,
    operations: stringifyJson([])!,
    query: `filter(.city == "New York" and .age > 30)`
  },
  {
    name: 'example 3',
    input: input2and3,
    query: `filter(.city == "New York") | timeSnapshot(2)`,
    // query: `filter(.city == "Chicago") | timeSnapshot(2)`,
    operations: stringifyJson([
      { path: '[2].city', value: 'Chicago' },
      { path: '[2].city', value: 'Atlanta' },
      { path: '[0].city', value: 'Chicago'}
    ])!
  }
]

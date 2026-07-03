import { jsonquery } from './jsonquery'
import { readFile } from 'fs/promises';

// const data = await readFile('json/dblp_1000.json', 'utf-8')
const data = await readFile('json/dblp_1000_temporal.json', 'utf-8')
const query = 'sequenced() | pick(.title)'
// const query = 'sequenced() | filter((.type == "inproceedings") and (.year == "2015")) | size()'
const result = jsonquery(JSON.parse(data), query)
console.log(result)

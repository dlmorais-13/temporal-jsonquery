import { jsonquery } from './jsonquery'
import { readFile } from 'fs/promises';
import { isEqual } from './is';

const results = [];

async function benchmark(size: number, type: 'regular' | 'temporal', query: string, verifyFn: (unknown) => boolean = undefined) {
    if (global.gc) global.gc();

    // Initial metrics.
    const startMemory = process.memoryUsage();
    const startTime = performance.now();

    // Read JSON and capture metrics.
    const data = await readFile(`json/dblp_${size}${type === 'temporal' ? '_temporal' : ''}.json`, 'utf-8');
    const json = JSON.parse(data);
    const readFileTime = performance.now();
    const readFileMemory = process.memoryUsage();

    // Run query and capture metrics.
    const result = jsonquery(json, query);
    const queryTime = performance.now();
    const queryMemory = process.memoryUsage();

    if (verifyFn && !verifyFn(result))
        console.warn(`Query "${query}" on ${type} data did not return the expected result.`);

    // Push results.
    results.push({
        'Size': size,
        'Type': type,
        'Query': query,
        'Read File Time (ms)': Number((readFileTime - startTime).toFixed(2)),
        'Read File Memory (KB)': Number(((readFileMemory.heapUsed - startMemory.heapUsed) / 1024).toFixed(4)),
        'Query Time (ms)': Number((queryTime - readFileTime).toFixed(2)),
        'Query Memory (KB)': Number(((queryMemory.heapUsed - readFileMemory.heapUsed) / 1024).toFixed(4))
    })
}

const sizes = [20000, 40000, 60000, 80000, 100000]

const query1 = '.0.title'
const query1Result = Array(5).fill('A 1.9nJ/pixel embedded deep neural network processor for high speed visual attention in a mobile vision recognition SoC.')

const query2 = 'filter(.type == "inproceedings") | size()'
const query2Result = [6985, 13918, 20831, 27822, 34774]

const query3 = 'pick(.title)'
const query3Result = ['title']

for (let idx in sizes) {
    await benchmark(sizes[idx], 'regular', query1, r => r === query1Result[idx])
    await benchmark(sizes[idx], 'temporal', `sequenced() | ${query1}`, r => r.versions[0][2] === query1Result[idx])

    await benchmark(sizes[idx], 'regular', query2, r => r === query2Result[idx])
    await benchmark(sizes[idx], 'temporal', `sequenced() | ${query2}`, r => r === query2Result[idx])

    await benchmark(sizes[idx], 'regular', query3, r => r.every(i => isEqual(Object.keys(i), query3Result)))
    await benchmark(sizes[idx], 'temporal', `sequenced() | ${query3}`, r => Object.values(r.data).every(i => isEqual(Object.keys(i), query3Result)))
}

console.table(results)

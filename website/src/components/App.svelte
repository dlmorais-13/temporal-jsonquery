<script lang="ts">
import { compile, parse, stringify } from '@jsonquerylang/jsonquery'
import { jsonquery, convertToTemporal } from '../../../lib/temporal-jsonquery.js'
import Button from './Button.svelte'
import { type Example, examples } from './data/examples'
import Playground from './Playground.svelte'
import { loadLocalStorage, saveLocalStorage } from './runes/localStorageState.svelte'
import { isTextFormat } from './typeguards'
import type { QueryText } from './types'
import { stringifyJson } from './stringifyJson'

if (typeof window !== 'undefined') {
  // @ts-ignore
  window.jsonquery = { jsonquery, stringify, parse, compile }
}

const keyInput = 'playground-input'
const keyOperations = 'playground-operations'
const keyTemporalJSON = 'playground-temporalJSON'
const keyQuery = 'playground-query'
const keyQueryTab = 'playground-query-tab'
const keyQuerySemantics = 'playground-query-semantics'

let name = $state(examples[0].name)
let input = $state(loadLocalStorage(keyInput, examples[0].input))
let operations = $state(loadLocalStorage(keyOperations, examples[0].operations))
// let temporalJSON = $state(loadLocalStorage(keyTemporalJSON, ''))
let temporalJSON = $state(loadLocalStorage(keyTemporalJSON, stringifyJson(convertToTemporal("", JSON.parse(examples[0].input), JSON.parse(examples[0].operations)))))
let queryTab: 'text' | 'json' = $state(loadLocalStorage(keyQueryTab, 'text'))
let querySemantics: 'nontemporalSemantics' | 'temporalSemantics' = $state(loadLocalStorage(keyQuerySemantics, 'nontemporalSemantics'))
let query: QueryText = $state(loadLocalStorage(keyQuery, { textFormat: examples[0].query }))

$effect(() => saveLocalStorage(keyInput, input))
$effect(() => saveLocalStorage(keyOperations, operations))
$effect(() => saveLocalStorage(keyTemporalJSON, temporalJSON))
$effect(() => saveLocalStorage(keyQuery, query))
$effect(() => saveLocalStorage(keyQueryTab, queryTab))
$effect(() => saveLocalStorage(keyQuerySemantics, querySemantics))

function loadExample(example: Example) {
  input = example.input
  operations = example.operations

  temporalJSON = stringifyJson(convertToTemporal("", JSON.parse(input), JSON.parse(operations)))

  //temporalJSON = JSON.stringify(convertToTemporal("", JSON.parse(example.input)),null,'  ')
  query = { textFormat: example.query }
  name = example.name
}

const activeExample = $derived(
  examples.find(
    (example) =>
      example.input === input && isTextFormat(query) && example.query === query.textFormat  // && JSON.stringify(convertToTemporal("", JSON.parse(input)),null,'  ') === temporalJSON
  )
)
</script>

<div class="examples">
  <div class="examples-inner">
    {#each examples as example}
      <Button class="example {activeExample === example ? 'active' : ''}" onclick={() => loadExample(example)}>{example.name}</Button>
    {/each}
  </div>
</div>

<Playground bind:input bind:operations bind:temporalJSON bind:query bind:queryTab bind:querySemantics/>

<style>
  .examples {
    padding: 0 var(--padding);
    display: flex;
    flex-direction: column;
  }

  .examples-inner {
    align-self: center;

    width: 100%;
    max-width: 1000px;
    margin: 30px 0 10px;

    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    gap: var(--button-margin);
  }
</style>
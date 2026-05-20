<script setup>
import { computed } from 'vue'

import {
  buildJsonPath,
  describeCollapsedJsonValue,
  formatJsonLiteral,
  getJsonLiteralTone,
  isExpandable,
  isJsonPathAncestor,
  isPlainObject
} from '../utils/json-formatter.mjs'

const props = defineProps({
  value: {
    type: null,
    required: true
  },
  path: {
    type: String,
    required: true
  },
  label: {
    type: [String, Number],
    required: true
  },
  depth: {
    type: Number,
    default: 0
  },
  expandedPaths: {
    type: Object,
    required: true
  },
  selectedPath: {
    type: String,
    default: ''
  },
  isLast: {
    type: Boolean,
    default: true
  }
})

const emit = defineEmits(['toggle', 'select'])

const expandable = computed(() => isExpandable(props.value))
const expanded = computed(() => expandable.value && props.expandedPaths.has(props.path))
const selected = computed(() => props.selectedPath === props.path)
const ancestor = computed(() => isJsonPathAncestor(props.path, props.selectedPath))
const rootNode = computed(() => props.path === '$')
const arrayItem = computed(() => typeof props.label === 'number')
const keyLabel = computed(() => {
  if (rootNode.value || arrayItem.value) {
    return ''
  }

  return JSON.stringify(String(props.label))
})
const inlineValue = computed(() => formatJsonLiteral(props.value))
const collapsedSummary = computed(() => describeCollapsedJsonValue(props.value))
const openingToken = computed(() => (Array.isArray(props.value) ? '[' : '{'))
const closingToken = computed(() => (Array.isArray(props.value) ? ']' : '}'))
const valueClassName = computed(() => `json-token--${getJsonLiteralTone(props.value)}`)

const children = computed(() => {
  if (Array.isArray(props.value)) {
    return props.value.map((item, index) => ({
      key: index,
      label: index,
      path: buildJsonPath(props.path, index),
      value: item
    }))
  }

  if (isPlainObject(props.value)) {
    return Object.entries(props.value).map(([key, item]) => ({
      key,
      label: key,
      path: buildJsonPath(props.path, key),
      value: item
    }))
  }

  return []
})

function handleToggle(event) {
  event.stopPropagation()
  emit('toggle', props.path)
}

function handleSelect() {
  emit('select', props.path)
}
</script>

<template>
  <li class="json-tree-node">
    <div
      class="json-tree-node__line"
      :class="{ 'is-selected': selected, 'is-ancestor': ancestor }"
      :style="{ paddingLeft: `${depth * 18}px` }"
      @click="handleSelect"
    >
      <button
        v-if="expandable"
        type="button"
        class="json-tree-node__toggle"
        :aria-label="expanded ? '折叠节点' : '展开节点'"
        @click="handleToggle"
      >
        <span>{{ expanded ? '−' : '+' }}</span>
      </button>

      <span v-else class="json-tree-node__toggle json-tree-node__toggle--placeholder"></span>

      <span class="json-tree-node__content">
        <template v-if="keyLabel">
          <span class="json-tree-node__key json-token--key">{{ keyLabel }}</span>
          <span class="json-tree-node__colon json-token--punctuation">: </span>
        </template>

        <template v-if="expandable">
          <span v-if="expanded" class="json-tree-node__brace json-token--punctuation">{{ openingToken }}</span>
          <template v-else>
            <span class="json-tree-node__summary">{{ collapsedSummary }}</span>
            <span v-if="!isLast" class="json-tree-node__comma json-token--punctuation">,</span>
          </template>
        </template>

        <template v-else>
          <span class="json-tree-node__value" :class="valueClassName">{{ inlineValue }}</span>
          <span v-if="!isLast" class="json-tree-node__comma json-token--punctuation">,</span>
        </template>
      </span>
    </div>

    <template v-if="expandable && expanded">
      <ul class="json-tree-node__children">
        <JsonFormatterTreeNode
          v-for="(child, index) in children"
          :key="child.path"
          :value="child.value"
          :path="child.path"
          :label="child.label"
          :depth="depth + 1"
          :expanded-paths="expandedPaths"
          :selected-path="selectedPath"
          :is-last="index === children.length - 1"
          @toggle="$emit('toggle', $event)"
          @select="$emit('select', $event)"
        />
      </ul>

      <div
        class="json-tree-node__line json-tree-node__line--closing"
        :class="{ 'is-selected': selected, 'is-ancestor': ancestor }"
        :style="{ paddingLeft: `${depth * 18}px` }"
        @click="handleSelect"
      >
        <span class="json-tree-node__toggle json-tree-node__toggle--placeholder"></span>
        <span class="json-tree-node__content">
          <span class="json-tree-node__brace json-token--punctuation">{{ closingToken }}</span>
          <span v-if="!isLast" class="json-tree-node__comma json-token--punctuation">,</span>
        </span>
      </div>
    </template>
  </li>
</template>

<style scoped>
.json-tree-node {
  list-style: none;
}

.json-tree-node__line {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  min-height: 32px;
  border-radius: 12px;
  padding: 5px 10px;
  color: var(--vp-c-text-1);
  cursor: pointer;
  transition: background-color 0.2s ease, box-shadow 0.2s ease;
}

.json-tree-node__line:hover {
  background: color-mix(in srgb, var(--vp-c-brand-1) 8%, transparent);
}

.json-tree-node__line.is-selected {
  background: color-mix(in srgb, var(--vp-c-brand-1) 14%, var(--vp-c-bg));
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--vp-c-brand-1) 34%, transparent);
}

.json-tree-node__line.is-ancestor:not(.is-selected) {
  background: color-mix(in srgb, var(--vp-c-brand-1) 7%, var(--vp-c-bg));
}

.json-tree-node__toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  margin-top: 3px;
  border: 1px solid color-mix(in srgb, var(--vp-c-brand-1) 28%, var(--vp-c-divider));
  border-radius: 999px;
  padding: 0;
  background: color-mix(in srgb, var(--vp-c-bg) 96%, var(--vp-c-brand-1) 4%);
  color: var(--vp-c-brand-1);
  font-size: 0.82rem;
  font-weight: 700;
  line-height: 1;
  cursor: pointer;
}

.json-tree-node__toggle--placeholder {
  border-color: transparent;
  background: transparent;
  color: transparent;
  cursor: default;
}

.json-tree-node__content {
  min-width: 0;
  flex: 1;
  font-family: 'SFMono-Regular', 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 0.9rem;
  line-height: 1.75;
  word-break: break-word;
}

.json-tree-node__summary {
  color: color-mix(in srgb, var(--vp-c-text-2) 92%, #e5c07b 8%);
}

.json-token--punctuation {
  color: var(--vp-c-text-1);
}

.json-token--key {
  color: #c678dd;
}

.json-token--string {
  color: #98c379;
}

.json-token--number {
  color: #d19a66;
}

.json-token--boolean {
  color: #61afef;
}

.json-token--null {
  color: #7f848e;
}

.json-tree-node__children {
  margin: 0;
  padding: 0;
}

.json-tree-node__line--closing {
  margin-top: -2px;
}
@media (max-width: 640px) {
  .json-tree-node__line {
    gap: 8px;
    padding: 4px 8px;
  }

  .json-tree-node__content {
    font-size: 0.84rem;
  }
}
</style>
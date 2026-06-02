import { clampPage, pageCount } from './pagination.js'

function assertEqual(actual: number, expected: number, label: string) {
  if (actual !== expected) {
    throw new Error(`${label}: got ${actual}, want ${expected}`)
  }
}

assertEqual(pageCount(0, 10), 1, 'empty page count')
assertEqual(pageCount(21, 10), 3, 'rounded page count')
assertEqual(pageCount(21, 0), 1, 'invalid limit page count')
assertEqual(clampPage(0, 3), 1, 'low page clamp')
assertEqual(clampPage(5, 3), 3, 'high page clamp')
assertEqual(clampPage(2, 3), 2, 'valid page')

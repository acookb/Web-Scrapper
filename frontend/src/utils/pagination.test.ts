import { describe, expect, it } from 'vitest'
import { visiblePageNumbers } from './pagination'

describe('visiblePageNumbers', () => {
  it('lists every page when there are few', () => {
    expect(visiblePageNumbers(1, 3)).toEqual([1, 2, 3])
  })

  it('centres the window on the current page', () => {
    expect(visiblePageNumbers(6, 20)).toEqual([4, 5, 6, 7, 8])
  })

  it('clamps the window at both ends', () => {
    expect(visiblePageNumbers(1, 20)).toEqual([1, 2, 3, 4, 5])
    expect(visiblePageNumbers(20, 20)).toEqual([16, 17, 18, 19, 20])
  })
})

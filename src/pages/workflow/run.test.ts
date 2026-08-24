import { normalizeHumanOptions } from './humanOptions'

describe('normalizeHumanOptions', () => {
  it('renders structured workflow options by label and submits their value', () => {
    expect(normalizeHumanOptions([
      { id: 'a1', label: '钢管规格', value: 'steel-pipe' },
      '其他',
    ])).toEqual([
      { label: '钢管规格', value: 'steel-pipe' },
      { label: '其他', value: '其他' },
    ])
  })
})

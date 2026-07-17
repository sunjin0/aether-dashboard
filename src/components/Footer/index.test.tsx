const React = require('react')
import { render } from '@testing-library/react'
import Footer from '.'

const mockDefaultFooter = jest.fn((_props: any) => null)

jest.mock('@ant-design/pro-components', () => ({
  DefaultFooter: (props: any) => mockDefaultFooter(props),
}))

describe('Footer', () => {
  it('can be fixed to the bottom of the layout', () => {
    render(<Footer fixed />)

    expect(mockDefaultFooter.mock.calls[0][0].style).toMatchObject({
      position: 'fixed',
      bottom: 0,
      background: 'none',
    })
    expect(mockDefaultFooter.mock.calls[0][0].className).toBe('fixed-footer')
  })
})

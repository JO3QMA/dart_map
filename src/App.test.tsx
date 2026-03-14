import { render, screen } from '@testing-library/react'
import Header from './components/Header'
import { expect, test } from 'vitest'

test('renders Header with correct title', () => {
  render(<Header />)
  const titleElement = screen.getByText(/ダーツの旅/i)
  expect(titleElement).toBeInTheDocument()
})

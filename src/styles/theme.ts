import { extendTheme } from '@chakra-ui/react'

const theme = extendTheme({
  colors: {
    brand: {
      purple: '#6531a3',
      cyan: '#00FFB7',
      white: '#FFFFFF'
    }
  },
  styles: {
    global: {
      body: {
        direction: 'rtl',
        background: '#6531a3'
      }
    }
  },
  fonts: {
    body: 'system-ui, sans-serif',
    heading: 'system-ui, sans-serif',
  }
})

export default theme
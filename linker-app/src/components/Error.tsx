import * as React from 'react'

export default React.memo(({ children }: { children: string }) => (
  <p style={{ color: 'var(--primary)' }}> Error: {children}</p>
))

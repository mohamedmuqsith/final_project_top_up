import React from 'react'
import { Show, SignInButton, SignUpButton, UserButton } from '@clerk/react'

function App() {
  return (
    <div>
      <h1>Home Page</h1>
        <Show when="signed-out">
          <SignInButton mode='modal'/>
          <SignUpButton />
        </Show>
        <Show when="signed-in">
          <UserButton />
        </Show>
    </div>
  )
}

export default App
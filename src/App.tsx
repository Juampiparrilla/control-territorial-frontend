import React from 'react'
import './App.css'
import PersonasPage from './pages/personas'

function App(): React.JSX.Element {
  return (
    <main className="app">
      <h1>Control Territorial</h1>
      <PersonasPage />
    </main>
  )
}

export default App

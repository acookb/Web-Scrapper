import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { LandingPage } from './pages/LandingPage'
import { PageDetails } from './pages/PageDetails'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/pages/:id" element={<PageDetails />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

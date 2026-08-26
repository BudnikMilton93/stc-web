import { Navigate, Route, Routes } from 'react-router-dom'
import { AdminLoginPage } from './pages/AdminLoginPage'
import { HomePage } from './pages/HomePage'

function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/panel-admin/login" element={<AdminLoginPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App

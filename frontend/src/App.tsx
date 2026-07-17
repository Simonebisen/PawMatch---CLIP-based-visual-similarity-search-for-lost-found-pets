import { Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import Landing from './pages/Landing'
import ReportForm from './pages/ReportForm'
import Results from './pages/Results'
import Browse from './pages/Browse'
import ReportDetail from './pages/ReportDetail'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Landing />} />
        <Route path="/report/:type" element={<ReportForm />} />
        <Route path="/results/:id" element={<Results />} />
        <Route path="/browse" element={<Browse />} />
        <Route path="/reports/:id" element={<ReportDetail />} />
      </Route>
    </Routes>
  )
}

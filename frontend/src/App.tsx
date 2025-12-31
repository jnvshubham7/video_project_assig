import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Home } from './pages/Home';
import { UploadVideo } from './pages/UploadVideo';
import { MyVideos } from './pages/MyVideos';
import { AllVideos } from './pages/AllVideos';
import { VideoPlayer } from './pages/VideoPlayer';
import { Header } from './components/Header';
import { ProtectedRoute } from './components/ProtectedRoute';
import './App.css';

function App() {
  return (
    <Router>
      <Header />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route 
          path="/upload" 
          element={
            <ProtectedRoute>
              <UploadVideo />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/my-videos" 
          element={
            <ProtectedRoute>
              <MyVideos />
            </ProtectedRoute>
          } 
        />
        <Route path="/videos" element={<AllVideos />} />
        <Route path="/video/:id" element={<VideoPlayer />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}

export default App;

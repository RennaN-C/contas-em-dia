import { Navigate, Route, Routes } from "react-router";
import { HomePage } from "./pages/HomePage";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";

export function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/cadastro" element={<RegisterPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

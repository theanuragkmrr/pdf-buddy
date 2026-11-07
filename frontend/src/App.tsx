import { Route, Routes } from "react-router-dom";
import { Layout } from "./components/layout/Layout";
import { Home } from "./pages/Home";
import { ToolPage } from "./pages/ToolPage";

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="/tool/:toolId" element={<ToolPage />} />
      </Route>
    </Routes>
  );
}

export default App;

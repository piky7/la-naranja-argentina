import { BrowserRouter, Routes, Route } from "react-router-dom";

import Header from "./components/Header";
import Home from "./pages/Home";
import Liga from "./pages/Liga";
import Equipos from "./pages/Equipos";
import Equipo from "./pages/Equipo";
import Jugadores from "./pages/Jugadores";
import Estadisticas from "./pages/Estadisticas";

function App() {
  return (
    <BrowserRouter>
      <Header />

      <Routes>
        <Route path="/" element={<Home />} />

        <Route path="/liga" element={<Liga />} />

        <Route path="/equipos" element={<Equipos />} />

        <Route
          path="/equipos/:teamId"
          element={<Equipo />}
        />

        <Route
          path="/jugadores"
          element={<Jugadores />}
        />

        <Route
          path="/estadisticas"
          element={<Estadisticas />}
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
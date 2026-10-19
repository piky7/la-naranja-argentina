
import { BrowserRouter, Routes, Route } from "react-router-dom";

import Header from "./components/Header";
import SeoMeta from "./components/SeoMeta";
import Footer from "./components/Footer";
import SwipeNavigation from "./components/SwipeNavigation";

import Home from "./pages/Home";
import Liga from "./pages/Liga";
import Equipos from "./pages/Equipos";
import Equipo from "./pages/Equipo";
import Jugadores from "./pages/Jugadores";
import Estadisticas from "./pages/Estadisticas";
import Privacidad from "./pages/Privacidad";
import Acerca from "./pages/Acerca";

function App() {
  return (
    <BrowserRouter>
      <SeoMeta />
      <SwipeNavigation />
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

        <Route
          path="/privacidad"
          element={<Privacidad />}
        />
        <Route path="/acerca" element={<Acerca />} />
      </Routes>

      <Footer />
    </BrowserRouter>
  );
}

export default App;

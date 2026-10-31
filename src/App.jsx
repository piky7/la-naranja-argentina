import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";

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
import Prode from "./pages/Prode";

function AnimatedRoutes() {
  const location = useLocation();
  const [animation, setAnimation] = useState("");

  useEffect(() => {
    const direction = location.state?.swipeDirection;
    setAnimation(direction === "left" ? "page-enter-from-right" :
      direction === "right" ? "page-enter-from-left" : "");
  }, [location.key, location.state]);

  return (
    <div key={location.key} className={animation}>
      <Routes location={location}>
        <Route path="/" element={<Home />} />
        <Route path="/liga" element={<Liga />} />
        <Route path="/equipos" element={<Equipos />} />
        <Route path="/equipos/:teamId" element={<Equipo />} />
        <Route path="/jugadores" element={<Jugadores />} />
        <Route path="/estadisticas" element={<Estadisticas />} />
        <Route path="/prode" element={<Prode />} />
        <Route path="/privacidad" element={<Privacidad />} />
        <Route path="/acerca" element={<Acerca />} />
      </Routes>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <SeoMeta />
      <SwipeNavigation />
      <Header />
      <AnimatedRoutes />
      <Footer />
    </BrowserRouter>
  );
}

export default App;

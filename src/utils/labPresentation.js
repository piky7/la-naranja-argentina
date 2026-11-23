export const LAB_CONFERENCES = {
  norte: ["amancay-lr","barrio-jardin-t","barrio-parque","bochas-cc","comunicaciones","el-ceibo-sf","hindu-c","independiente-sde","jujuy-basquet","mitre-posadas","riachuelo-lr","salta-basket","san-isidro","santa-paula-g","sp-suardi","union-sf","villa-san-martin"],
  sur: ["centenario-vt","central-entrerriano","ciclista-j","dep-norte","dep-viedma","gimnasia-lp","la-union-c","pergamino-basquet","pico-fc","provincial-r","quilmes-mdp","racing-a","regatas-sn","river","rocamora","union-mdp","villa-mitre-bb"]
};

export const LAB_TEAM_COLORS = {
  "amancay-lr": "#c49a32",
  "barrio-jardin-t": "#28794b",
  "barrio-parque": "#28794b",
  "bochas-cc": "#c52f3d",
  "centenario-vt": "#287db8",
  "central-entrerriano": "#b72d3b",
  "ciclista-j": "#bd303e",
  "comunicaciones": "#d5a62c",
  "dep-norte": "#1783bd",
  "dep-viedma": "#2775b7",
  "el-ceibo-sf": "#c52f3d",
  "gimnasia-lp": "#24558c",
  "hindu-c": "#28784b",
  "independiente-sde": "#c32f3d",
  "jujuy-basquet": "#287bb6",
  "la-union-c": "#1878b5",
  "mitre-posadas": "#d2a32b",
  "pergamino-basquet": "#2774ae",
  "pico-fc": "#bd303c",
  "provincial-r": "#c22e3c",
  "quilmes-mdp": "#2b5689",
  "racing-a": "#258bc0",
  "regatas-sn": "#267eb5",
  "riachuelo-lr": "#b72d3d",
  "river": "#c32d3b",
  "rocamora": "#bf303c",
  "salta-basket": "#287bb6",
  "san-isidro": "#c52e3d",
  "santa-paula-g": "#287bb6",
  "sp-suardi": "#c52f3d",
  "union-mdp": "#2678b6",
  "union-sf": "#c52e3c",
  "villa-mitre-bb": "#28794b",
  "villa-san-martin": "#bd303e"
};

export const labMatchColor = team => LAB_TEAM_COLORS[team?.slug] || "#315a7b";

export const formatLabLiveRemaining = live => {
  const parts = typeof live?.lastActionTime === "string" ? live.lastActionTime.match(/^(\d{2}):(\d{2}):(\d{2})$/) : null;
  if (parts) {
    const elapsed = Number(parts[1])*3600 + Number(parts[2])*60 + Number(parts[3]);
    if (elapsed >= 0 && elapsed <= 600) return `${String(Math.floor(elapsed/60)).padStart(2,"0")}:${String(elapsed%60).padStart(2,"0")}`;
  }
  const minutes = Number(live?.minutesRemaining);
  return Number.isFinite(minutes) && minutes >= 0 ? `${String(Math.floor(minutes)).padStart(2,"0")}:00` : null;
};

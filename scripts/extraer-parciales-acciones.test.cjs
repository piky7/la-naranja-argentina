const test=require("node:test");
const assert=require("node:assert/strict");
const {extraerParcialesDesdeAcciones}=require("./extraer-parciales-acciones.cjs");
function accion(p,l,v,t="00:00:01") {
 return '<li class="accion local TIRO2-ANOTADO"><span class="informacion">Cuarto '+p+' - '+t+'</span><strong class="informacionAdicional">'+l+' - '+v+'</strong></li>';
}
test("reconstruye cuatro parciales desde marcadores acumulados en orden inverso",()=>{
 const html=[accion(4,54,68),accion(4,50,62),accion(3,40,50),accion(2,24,36),accion(1,16,17)].join("");
 const r=extraerParcialesDesdeAcciones(html);
 assert.equal(r.validos,true);
 assert.deepEqual(r.parciales.map(p=>[p.local,p.visitante]),[[16,17],[8,19],[16,14],[14,18]]);
});
test("no valida si falta un período",()=>{
 const r=extraerParcialesDesdeAcciones(accion(4,54,68)+accion(2,24,36)+accion(1,16,17));
 assert.equal(r.validos,false);
});
test("rechaza acumulados decrecientes",()=>{
 const r=extraerParcialesDesdeAcciones(accion(4,54,68)+accion(3,40,50)+accion(2,24,36)+accion(1,26,17));
 assert.equal(r.validos,false);
});

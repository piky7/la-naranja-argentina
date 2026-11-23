// Inspección aislada: node scripts/probar-parciales-acciones.cjs "URL_OFICIAL"
const {extraerParcialesDesdeAcciones}=require("./extraer-parciales-acciones.cjs");
const url=process.argv[2];
if (!url || !/^https:\/\/www\.laliganacional\.com\.ar\/laliga\/partido\//.test(url)) {
 console.error('Uso: node scripts/probar-parciales-acciones.cjs "URL_OFICIAL"');
 process.exit(1);
}
(async()=>{
 const res=await fetch(url,{headers:{"User-Agent":"Mozilla/5.0",Accept:"text/html"},signal:AbortSignal.timeout(20000)});
 if(!res.ok)throw Error("HTTP "+res.status);
 const html=await res.text();
 const resultado=extraerParcialesDesdeAcciones(html);
 console.log(JSON.stringify(resultado,null,2));
})().catch(e=>{console.error(e.message);process.exitCode=1;});

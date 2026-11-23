import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const html=readFileSync(new URL("../index.html",import.meta.url),"utf8");
const homeCss=readFileSync(new URL("../src/pages/Home.css",import.meta.url),"utf8");

test("La fuente Anton no bloquea el render de Home ni se importa dos veces",()=>{
  assert.doesNotMatch(homeCss,/@import\s+(?:url\()?["']?https:\/\/fonts\.googleapis\.com/i);
  assert.match(html,/fonts\.googleapis\.com\/css2\?family=Anton&display=swap/);
  assert.match(html,/rel="stylesheet" media="print" onload="this\.media='all'"/);
  assert.match(html,/<noscript><link href="https:\/\/fonts\.googleapis\.com\/css2\?family=Anton&display=swap" rel="stylesheet" \/><\/noscript>/);
  assert.equal((html.match(/<link[^>]+fonts\.googleapis\.com\/css2/g)||[]).length,2);
});

test("La identidad sigue usando Anton con fuente de respaldo sin cambiar componentes",()=>{
  assert.match(homeCss,/font-family:\s*["']?Anton["']?,\s*Impact/i);
  assert.match(html,/<link rel="preconnect" href="https:\/\/fonts\.gstatic\.com" crossorigin/);
});

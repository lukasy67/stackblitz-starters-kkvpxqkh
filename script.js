const API_URL = "Ahttps://script.google.com/macros/s/AKfycbzqkLS7-VmjpksfIfSLouknRIt7IYR0Xhh37CmLXSs8ps4j1y9_yyGSF81pKXtmLJRx/exec";
function openTab(evt, tabName) {
  var i, tabcontent, tablinks;
  tabcontent = document.getElementsByClassName("tab-content");
  for (i = 0; i < tabcontent.length; i++) { tabcontent[i].style.display = "none"; }
  tablinks = document.getElementsByClassName("tab-link");
  for (i = 0; i < tablinks.length; i++) { tablinks[i].className = tablinks[i].className.replace(" active", ""); }
  document.getElementById(tabName).style.display = "block";
  evt.currentTarget.className += " active";
}
// Lógica de Parsing para Atribución por Carrera
function obtenerCarrera(nombreCompleto) {
  const regExp = /\(([^)]+)\)/;
  const matches = regExp.exec(nombreCompleto);
  return matches ? matches[1] : "Sin Carrera";
}
function renderizarNombre(nombreCompleto) {
  return nombreCompleto.split(' (')[0];
}
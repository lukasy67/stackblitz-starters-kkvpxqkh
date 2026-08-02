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
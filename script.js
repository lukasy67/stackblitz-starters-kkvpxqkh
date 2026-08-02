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
function renderizarMedallero(listaMedallero) {
  const contenedor = document.getElementById("medallero-content"); // ID de tu contenedor
  
  let html = `
    <table class="tabla-deportiva">
      <thead>
        <tr>
          <th>Curso / Equipo</th>
          <th>Futsal M</th>
          <th>Futsal F</th>
          <th>Fútbol</th>
          <th>Vóley</th>
          <th>Pikivoley</th>
          <th>E-Sports</th>
          <th>Ajedrez</th>
          <th>TOTAL PTS</th>
        </tr>
      </thead>
      <tbody>
  `;

  listaMedallero.forEach(fila => {
    html += `
      <tr>
        <td><strong>${fila.curso}</strong></td>
        <td>${fila.futsalM || 0}</td>
        <td>${fila.futsalF || 0}</td>
        <td>${fila.futbol || 0}</td>
        <td>${fila.voley || 0}</td>
        <td>${fila.pikivoley || 0}</td>
        <td>${fila.esports || 0}</td>
        <td>${fila.ajedrez || 0}</td>
        <td><span class="badge-total">${fila.totalPts || 0} Pts</span></td>
      </tr>
    `;
  });

  html += `</tbody></table>`;
  contenedor.innerHTML = html;
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
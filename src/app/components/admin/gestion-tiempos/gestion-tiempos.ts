import { Component, OnInit } from '@angular/core';
import { EquiposService } from '../../../services/equipos';
import { ResultadosService } from '../../../services/resultados';
import { CommonModule } from '@angular/common';
import { Loading } from '../../shared/loading/loading';
import { FormsModule } from '@angular/forms'; // Añadir este import
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-gestion-tiempos',
  standalone: true,
  imports: [CommonModule, Loading, FormsModule, RouterModule], // Añadir FormsModule
  templateUrl: './gestion-tiempos.html',
  styleUrls: ['./gestion-tiempos.scss']
})
export class GestionTiempos implements OnInit {
  equipos: any[] = [];
  equiposFiltrados: any[] = []; // Nueva propiedad para equipos filtrados
  equipoSeleccionado: any = null;
  participantes: any[] = [];
  loading = true;
  tiempoEditando: { [key: string]: boolean } = {};
  terminoBusqueda: string = ''; // Variable para el término de búsqueda

  constructor(
    private equiposService: EquiposService,
    private resultadosService: ResultadosService
  ) { }

  ngOnInit(): void {
    this.cargarEquipos();
  }

  cargarEquipos(): void {
    this.equiposService.getEquipos().subscribe(equipos => {
      this.equipos = equipos;
      this.equiposFiltrados = [...equipos]; // Inicializar con todos los equipos
      this.loading = false;
    });
  }

  // Método para filtrar equipos
  filtrarEquipos(): void {
    if (!this.terminoBusqueda) {
      this.equiposFiltrados = [...this.equipos];
      return;
    }

    const termino = this.terminoBusqueda.toLowerCase();
    this.equiposFiltrados = this.equipos.filter(equipo =>
      equipo.nombre.toLowerCase().includes(termino)
    );
  }

  cerrarformulario(): void {
    this.equipoSeleccionado = null;
    this.participantes = [];
    return;
  }

  seleccionarEquipo(equipoId: string): void {
    // Si ya está seleccionado, deseleccionarlo (cerrar formulario)
    if (this.equipoSeleccionado?.id === equipoId) {
      this.equipoSeleccionado = null;
      this.participantes = [];
      return;
    }
    this.equipoSeleccionado = this.equipos.find(e => e.id === equipoId);
    this.equiposService.getParticipantes(equipoId).subscribe(participantes => {
      // Ordenar participantes por disciplina: natación -> ciclismo -> atletismo
      this.participantes = participantes.sort((a, b) => {
        const order = ['natacion', 'ciclismo', 'atletismo'];
        // Asegurarnos de que las disciplinas no sean null
        const disciplinaA = a.disciplina || '';
        const disciplinaB = b.disciplina || '';
        return order.indexOf(disciplinaA) - order.indexOf(disciplinaB);
      });
      this.participantes.forEach(p => {
        this.tiempoEditando[p.id] = false;
      });
    });
  }

  formatTimeInput(event: any, participanteId: string): void {
    let value = event.target.value.replace(/\D/g, '');

    if (value.length > 2) value = value.substring(0, 2) + ':' + value.substring(2);
    if (value.length > 5) value = value.substring(0, 5) + ':' + value.substring(5);
    if (value.length > 8) value = value.substring(0, 8) + '.' + value.substring(8);
    if (value.length > 12) value = value.substring(0, 12);

    event.target.value = value;

    // Actualizar el valor en el participante
    const participante = this.participantes.find(p => p.id === participanteId);
    if (participante) {
      participante.tiempo = value;
    }
  }

  editarTiempo(participanteId: string): void {
    this.tiempoEditando[participanteId] = true;
  }

  guardarTiempo(participante: any, nuevoTiempo: string): void {
    // Asegurarse de que el tiempo tenga el formato completo
    if (!nuevoTiempo.includes(':')) {
      // Si el usuario solo ingresó números, formatearlo
      let formattedTime = nuevoTiempo.replace(/\D/g, '');
      formattedTime = formattedTime.padEnd(6, '0').substring(0, 6);
      formattedTime = `${formattedTime.substring(0, 2)}:${formattedTime.substring(2, 4)}:${formattedTime.substring(4, 6)}`;
      nuevoTiempo = formattedTime;
    }

    // Asegurarse de que tenga milisegundos
    if (!nuevoTiempo.includes('.')) {
      nuevoTiempo += '.000';
    }

    if (!this.validarFormatoTiempo(nuevoTiempo)) {
      alert('Formato de tiempo inválido. Use HH:MM:SS.000');
      return;
    }

    this.equiposService.updateParticipante(
      participante.equipoId,
      participante.id,
      { tiempo: nuevoTiempo }
    ).then(() => {
      this.resultadosService.calcularTiempoTotal(participante.equipoId)
        .then(() => this.resultadosService.actualizarPosiciones())
        .then(() => {
          this.tiempoEditando[participante.id] = false;
          this.cargarEquipos();
        });
    }).catch(error => {
      console.error('Error actualizando tiempo:', error);
      alert('Error actualizando tiempo');
    });
  }

  validarFormatoTiempo(tiempo: string): boolean {
    return /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](\.\d{1,3})?$/.test(tiempo);
  }

  aplicarPenalizacion(participante: any): void {
    if (!participante.disciplina) {
      alert('El participante debe tener una disciplina asignada');
      return;
    }

    if (confirm(`¿Aplicar penalización de 5 minutos al participante ${participante.nombre}?`)) {
      this.resultadosService.aplicarPenalizacion(
        participante.id,
        participante.equipoId,
        participante.disciplina
      )
        .then(() => {
          alert('Penalización aplicada correctamente');
          this.cargarEquipos();
        })
        .catch((error: Error) => {
          console.error('Error al aplicar penalización:', error);
          alert('Error aplicando penalización: ' + error.message);
        });
    }
  }

  asignarPremioEspecial(participante: any): void {
    if (confirm(`¿Asignar premio especial a ${participante.nombre}?`)) {
      this.resultadosService.setPremioEspecial(participante.id, participante.equipoId)
        .then(() => alert('Premio especial asignado'))
        .catch(error => {
          console.error('Error asignando premio:', error);
          alert('Error asignando premio');
        });
    }
  }
}
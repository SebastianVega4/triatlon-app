import { Component, OnInit } from '@angular/core';
import { EquiposService } from '../../../services/equipos';
import { ResultadosService } from '../../../services/resultados';
import { CommonModule } from '@angular/common';
import { Loading } from '../../shared/loading/loading';

@Component({
  selector: 'app-gestion-tiempos',
  standalone: true,
  imports: [CommonModule, Loading],
  templateUrl: './gestion-tiempos.html',
  styleUrls: ['./gestion-tiempos.scss']
})
export class GestionTiempos implements OnInit {
  equipos: any[] = [];
  equipoSeleccionado: any = null;
  participantes: any[] = [];
  loading = true;
  tiempoEditando: { [key: string]: boolean } = {};

  constructor(
    private equiposService: EquiposService,
    private resultadosService: ResultadosService
  ) {}

  ngOnInit(): void {
    this.cargarEquipos();
  }

  cargarEquipos(): void {
    this.equiposService.getEquipos().subscribe(equipos => {
      this.equipos = equipos;
      this.loading = false;
    });
  }

  seleccionarEquipo(equipoId: string): void {
    this.equipoSeleccionado = this.equipos.find(e => e.id === equipoId);
    this.equiposService.getParticipantes(equipoId).subscribe(participantes => {
      this.participantes = participantes;
      this.participantes.forEach(p => {
        this.tiempoEditando[p.id] = false;
      });
    });
  }

  editarTiempo(participanteId: string): void {
    this.tiempoEditando[participanteId] = true;
  }

  guardarTiempo(participante: any, nuevoTiempo: string): void {
    if (!this.validarFormatoTiempo(nuevoTiempo)) {
      alert('Formato de tiempo inválido. Use HH:MM:SS');
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
          this.cargarEquipos(); // Refrescar lista de equipos
        });
    }).catch(error => {
      console.error('Error actualizando tiempo:', error);
      alert('Error actualizando tiempo');
    });
  }

  validarFormatoTiempo(tiempo: string): boolean {
    return /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/.test(tiempo);
  }

  aplicarPenalizacion(participante: any): void {
    if (!participante.disciplina) {
      alert('El participante debe tener una disciplina asignada');
      return;
    }

    if (confirm(`¿Aplicar penalización de 5 minutos al participante ${participante.nombre}?`)) {
      this.resultadosService.aplicarPenalizacion(
        participante.equipoId,
        participante.disciplina
      ).then(() => {
        alert('Penalización aplicada correctamente');
        this.cargarEquipos();
      }).catch(error => {
        console.error('Error aplicando penalización:', error);
        alert('Error aplicando penalización');
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
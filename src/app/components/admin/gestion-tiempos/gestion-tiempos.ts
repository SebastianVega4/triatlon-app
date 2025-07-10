import { Component, OnInit } from '@angular/core';
import { EquiposService } from '../../../services/equipos';
import { ResultadosService } from '../../../services/resultados';
import { switchMap } from 'rxjs/operators';

@Component({
  selector: 'app-gestion-tiempos',
  templateUrl: './gestion-tiempos.html',
  styleUrls: ['./gestion-tiempos.scss']
})
export class GestionTiempos implements OnInit {
  equipos: any[] = [];
  equipoSeleccionado: any = null;
  participantes: any[] = [];
  loading = true;

  constructor(
    private equiposService: EquiposService,
    private resultadosService: ResultadosService
  ) {}

  ngOnInit(): void {
    this.equiposService.getEquipos().subscribe(equipos => {
      this.equipos = equipos;
      this.loading = false;
    });
  }

  seleccionarEquipo(equipoId: string): void {
    this.equiposService.getEquipo(equipoId).pipe(
      switchMap(equipo => {
        this.equipoSeleccionado = equipo;
        return this.equiposService.getParticipantes(equipoId);
      })
    ).subscribe(participantes => {
      this.participantes = participantes;
    });
  }

  actualizarTiempo(participante: any, tiempo: string): void {
    this.equiposService.updateParticipante(
      participante.equipoId,
      participante.id,
      { tiempo }
    ).then(() => {
      this.resultadosService.calcularTiempoTotal(participante.equipoId)
        .then(() => this.resultadosService.actualizarPosiciones());
    });
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
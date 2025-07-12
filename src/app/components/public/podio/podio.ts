import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EquiposService } from '../../../services/equipos';
import { ResultadosService } from '../../../services/resultados';
import { map } from 'rxjs/operators';
import { Loading } from '../../shared/loading/loading';
import { Equipo } from '../../../interfaces/equipo.interface';
import { RouterLink } from '@angular/router';
import { combineLatest } from 'rxjs';

@Component({
  selector: 'app-podio',
  standalone: true,
  imports: [CommonModule, Loading, RouterLink],
  templateUrl: './podio.html',
  styleUrls: ['./podio.scss']
})
export class PodioComponent implements OnInit {
  podio: Equipo[] = [];
  otrosEquipos: Equipo[] = []; // <-- Añade esta línea
  loading = true;
  resultadosVisibles = true;

  constructor(
    private equiposService: EquiposService,
    private resultadosService: ResultadosService
  ) { }

  ngOnInit(): void {
    combineLatest([
      this.equiposService.getEquipos().pipe(
        map(equipos => {
          const equiposOrdenados = equipos
            .filter(e => e.posicion)
            .sort((a, b) => (a.posicion || 0) - (b.posicion || 0));
          
          return {
            podio: equiposOrdenados.filter(e => e.posicion && e.posicion <= 3),
            otros: equiposOrdenados.filter(e => e.posicion && e.posicion > 3)
          };
        })),
      this.resultadosService.getVisibilidadResultados()
    ]).subscribe(([{podio, otros}, visibles]) => {
      this.podio = podio;
      this.otrosEquipos = otros; // <-- Asegúrate de asignar los valores aquí
      this.resultadosVisibles = visibles;
      this.loading = false;
    });
  }
}
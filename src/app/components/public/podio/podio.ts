import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EquiposService } from '../../../services/equipos';
import { ResultadosService } from '../../../services/resultados';
import { map } from 'rxjs/operators';
import { Loading } from '../../shared/loading/loading';
import { Equipo } from '../../../interfaces/equipo.interface';
import { RouterLink } from '@angular/router'; // Cambiado de RouterModule
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

@Component({
  selector: 'app-podio',
  standalone: true,
  imports: [CommonModule, Loading],
  templateUrl: './podio.html',
  styleUrls: ['./podio.scss']
})
export class PodioComponent implements OnInit {
  podio: Equipo[] = [];
  loading = true;

  constructor(
    private equiposService: EquiposService,
    private resultadosService: ResultadosService
  ) { }

  ngOnInit(): void {
    this.equiposService.getEquipos().pipe(
      map(equipos => {
        return equipos
          .filter((e: Equipo) => e.posicion && e.posicion <= 3)
          .sort((a: Equipo, b: Equipo) => (a.posicion || 0) - (b.posicion || 0));
      })
    ).subscribe(equipos => {
      this.podio = equipos;
      this.loading = false;
    });
  }
}
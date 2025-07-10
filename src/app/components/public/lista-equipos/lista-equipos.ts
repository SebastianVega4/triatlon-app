import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { EquiposService } from '../../../services/equipos';
import { ResultadosService } from '../../../services/resultados';
import { combineLatest } from 'rxjs';

@Component({
  selector: 'app-lista-equipos',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './lista-equipos.html',
  styleUrls: ['./lista-equipos.scss']
})
export class ListaEquipos implements OnInit {
  equipos: any[] = [];
  resultadosVisibles = true;
  loading = true;

  constructor(
    private equiposService: EquiposService,
    private resultadosService: ResultadosService
  ) {}

  ngOnInit(): void {
    combineLatest([
      this.equiposService.getEquipos(),
      this.resultadosService.getVisibilidadResultados()
    ]).subscribe(([equipos, visibles]) => {
      this.equipos = equipos.sort((a, b) => (a.posicion || 999) - (b.posicion || 999));
      this.resultadosVisibles = visibles;
      this.loading = false;
    });
  }

  getClasePosicion(posicion: number): string {
    if (posicion === 1) return 'gold';
    if (posicion === 2) return 'silver';
    if (posicion === 3) return 'bronze';
    return '';
  }
}
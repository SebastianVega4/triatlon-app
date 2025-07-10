import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EquiposService } from '../../../services/equipos';
import { ResultadosService } from '../../../services/resultados';

@Component({
  selector: 'app-podio',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './podio.html',
  styleUrls: ['./podio.scss']
})
export class PodioComponent implements OnInit {
  podio: any[] = [];
  loading = true;

  constructor(
    private equiposService: EquiposService,
    private resultadosService: ResultadosService
  ) {}

  ngOnInit(): void {
    this.equiposService.getEquipos().subscribe(equipos => {
      this.podio = equipos
        .filter(e => e.posicion && e.posicion <= 3)
        .sort((a, b) => a.posicion - b.posicion);
      this.loading = false;
    });
  }
}
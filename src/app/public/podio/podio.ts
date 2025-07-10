import { Component, OnInit } from '@angular/core';
import { EquiposService } from '../../services/equipos.service';
import { ResultadosService } from '../../services/resultados.service';

@Component({
  selector: 'app-podio',
  templateUrl: './podio.component.html',
  styleUrls: ['./podio.component.scss']
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
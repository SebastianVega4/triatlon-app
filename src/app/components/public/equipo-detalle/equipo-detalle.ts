import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { EquiposService } from '../../../services/equipos';
import { Loading } from '../../shared/loading/loading';
@Component({
  selector: 'app-equipo-detalle',
  standalone: true,
  imports: [CommonModule, Loading],
  templateUrl: './equipo-detalle.html',
  styleUrls: ['./equipo-detalle.scss']
})
export class EquipoDetalle implements OnInit {
  equipo: any = null;
  participantes: any[] = [];
  loading = true;

  constructor(
    private route: ActivatedRoute,
    private equiposService: EquiposService
  ) {}

  ngOnInit(): void {
    const equipoId = this.route.snapshot.paramMap.get('id');
    if (equipoId) {
      this.equiposService.getEquipo(equipoId).subscribe(equipo => {
        this.equipo = equipo;
        this.equiposService.getParticipantes(equipoId).subscribe(participantes => {
          this.participantes = participantes;
          this.loading = false;
        });
      });
    }
  }
}
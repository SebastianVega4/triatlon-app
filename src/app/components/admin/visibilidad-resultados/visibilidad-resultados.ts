import { Component, OnInit } from '@angular/core';
import { ResultadosService } from '../../../services/resultados';
import { CommonModule } from '@angular/common';
import { Loading } from '../../shared/loading/loading';

@Component({
  selector: 'app-visibilidad-resultados',
  standalone: true,
  imports: [CommonModule, Loading],
  templateUrl: './visibilidad-resultados.html',
  styleUrls: ['./visibilidad-resultados.scss']
})
export class VisibilidadResultados implements OnInit {
  resultadosVisibles = false;
  loading = false;

  constructor(private resultadosService: ResultadosService) {}

  ngOnInit(): void {
    this.resultadosService.getVisibilidadResultados().subscribe(visible => {
      this.resultadosVisibles = visible;
    });
  }

  toggleVisibilidad(): void {
    this.loading = true;
    this.resultadosService.toggleVisibilidadResultados(!this.resultadosVisibles)
      .then(() => {
        this.resultadosVisibles = !this.resultadosVisibles;
        this.loading = false;
      })
      .catch(error => {
        console.error('Error cambiando visibilidad:', error);
        this.loading = false;
      });
  }
}
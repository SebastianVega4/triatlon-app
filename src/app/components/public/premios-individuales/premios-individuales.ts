import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ResultadosService } from '../../../services/resultados';
import { Loading } from '../../shared/loading/loading';

@Component({
  selector: 'app-premios-individuales',
  standalone: true,
  imports: [CommonModule, Loading],
  templateUrl: './premios-individuales.html',
  styleUrls: ['./premios-individuales.scss']
})
export class PremiosIndividuales implements OnInit {
  premios: any[] = [];
  loading = true;

  constructor(private resultadosService: ResultadosService) {}

  ngOnInit(): void {
    this.resultadosService.getPremiosIndividuales().subscribe(premios => {
      this.premios = premios;
      this.loading = false;
    });
  }

  getCategoriaNombre(categoria: string): string {
    const map: Record<string, string> = {
      'mejor_mujer_natacion': 'Mejor mujer en natación',
      'mejor_hombre_natacion': 'Mejor hombre en natación',
      'mejor_mujer_ciclismo': 'Mejor mujer en ciclismo',
      'mejor_hombre_ciclismo': 'Mejor hombre en ciclismo',
      'mejor_mujer_atletismo': 'Mejor mujer en atletismo',
      'mejor_hombre_atletismo': 'Mejor hombre en atletismo',
      'actitud_deportiva': 'Premio a la actitud deportiva'
    };
    return map[categoria] || categoria;
  }
}
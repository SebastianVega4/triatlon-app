import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ResultadosService } from '../../../services/resultados';
import { Loading } from '../../shared/loading/loading';
import { catchError, finalize, take, of } from 'rxjs';

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
  resultadosVisibles = true;
  errorMessage: string | null = null;

  constructor(
    private resultadosService: ResultadosService,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    this.cargarPremios();
  }

  cargarPremios(): void {
    this.loading = true;
    this.errorMessage = null;
    this.premios = [];
    this.cdr.detectChanges(); // Forzar detección de cambios inicial

    // Primero verificar visibilidad
    this.resultadosService.getVisibilidadResultados().pipe(
      take(1), // Asegura que el observable se complete
      catchError(err => {
        console.error('Error visibilidad:', err);
        this.resultadosVisibles = true;
        return of(true);
      })
    ).subscribe(visibles => {
      this.resultadosVisibles = !!visibles;
      
      if (!this.resultadosVisibles) {
        this.errorMessage = 'Los resultados están ocultos temporalmente';
        this.loading = false;
        this.cdr.detectChanges();
        return;
      }

      // Si los resultados son visibles, cargar premios
      this.resultadosService.getPremiosIndividuales().pipe(
        take(1), // Asegura que el observable se complete
        catchError(err => {
          console.error('Error premios:', err);
          this.errorMessage = 'Error al cargar premios';
          return of([]);
        }),
        finalize(() => {
          this.loading = false;
          this.cdr.detectChanges();
        })
      ).subscribe(premios => {
        this.premios = premios || [];
        if (this.premios.length === 0) {
          this.errorMessage = 'No hay premios registrados';
        }
        this.cdr.detectChanges();
      });
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
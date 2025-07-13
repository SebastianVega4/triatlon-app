import { Component, OnInit } from '@angular/core';
import { EquiposService } from '../../../services/equipos';
import { ResultadosService } from '../../../services/resultados';
import { AuthService } from '../../../services/auth';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink } from '@angular/router';
import { Loading } from '../../shared/loading/loading';
import { take } from 'rxjs/operators';
import { Premio } from '../../../interfaces/premio.interface';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, Loading],
  templateUrl: './admin-dashboard.html',
  styleUrls: ['./admin-dashboard.scss']
})
export class AdminDashboard implements OnInit {
  equipos: any[] = [];
  loading = true;

  constructor(
    private equiposService: EquiposService,
    private resultadosService: ResultadosService,
    private authService: AuthService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.equiposService.getEquipos().subscribe(equipos => {
      this.equipos = equipos;
      this.loading = false;
    });
  }

  async calcularResultados(): Promise<void> {
    this.loading = true;

    try {
      await this.resultadosService.calcularPremios();
      alert('Premios calculados correctamente');
    } catch (error: unknown) {
      let errorMessage = 'Ocurrió un error al calcular los premios';

      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }

      console.error('Error detallado:', error);
      alert(`Error: ${errorMessage}`);

      // Mostrar más detalles en consola para diagnóstico
      if (error instanceof Error && error.stack) {
        console.error('Stack trace:', error.stack);
      }
    } finally {
      this.loading = false;
    }
  }

  logout(): void {
    this.authService.logout();
  }
}
import { Component, OnInit } from '@angular/core';
import { EquiposService } from '../../../services/equipos';
import { ResultadosService } from '../../../services/resultados';
import { AuthService } from '../../../services/auth';
import { Router } from '@angular/router';

@Component({
  selector: 'app-admin-dashboard',
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
  ) {}

  ngOnInit(): void {
    this.equiposService.getEquipos().subscribe(equipos => {
      this.equipos = equipos;
      this.loading = false;
    });
  }

  calcularResultados(): void {
    this.resultadosService.calcularPremios().then(() => {
      alert('Premios calculados correctamente');
    }).catch(error => {
      console.error('Error calculando premios:', error);
      alert('Error calculando premios');
    });
  }

  logout(): void {
    this.authService.logout();
  }
}
import { Routes } from '@angular/router';
import { ListaEquipos } from './components/public/lista-equipos/lista-equipos';
import { Podio } from './components/public/podio/podio';
import { EquipoDetalle } from './components/public/equipo-detalle/equipo-detalle';
import { PremiosIndividuales } from './components/public/premios-individuales/premios-individuales';
import { ResultadosDisciplina } from './components/public/resultados-disciplina/resultados-disciplina';
import { AdminDashboard } from './components/admin/admin-dashboard/admin-dashboard';
import { CrearEquipo } from './components/admin/crear-equipo/crear-equipo';
import { EditarEquipo } from './components/admin/editar-equipo/editar-equipo';
import { GestionTiempos } from './components/admin/gestion-tiempos/gestion-tiempos';
import { VisibilidadResultados } from './components/admin/visibilidad-resultados/visibilidad-resultados';
import { AdminGuard } from './guards/admin-guard';
import { Login} from './components/shared/login/login';
import { Participantes } from './components/public/participantes/participantes';

export const routes: Routes = [
  // Rutas públicas
  { path: '', component: ListaEquipos, title: 'Inicio - Triatlón' },
  { path: 'podio', component: Podio, title: 'Podio - Triatlón' },
  { path: 'participantes', component: Participantes, title: 'Podio - Participantes' },
  { path: 'equipo/:id', component: EquipoDetalle, title: 'Detalle de Equipo - Triatlón' },
  { path: 'premios-individuales', component: PremiosIndividuales, title: 'Premios Individuales - Triatlón' },
  { path: 'resultados/:disciplina', component: ResultadosDisciplina, title: 'Resultados por Disciplina - Triatlón' },
  
  // Rutas de administración
  { 
    path: 'admin', 
    component: AdminDashboard,
    canActivate: [AdminGuard],
    title: 'Admin Dashboard - Triatlón',
    children: [
      { path: 'crear-equipo', component: CrearEquipo, title: 'Crear Equipo - Admin' },
      { path: 'editar-equipo/:id', component: EditarEquipo, title: 'Editar Equipo - Admin' },
      { path: 'gestion-tiempos', component: GestionTiempos, title: 'Gestión de Tiempos - Admin' },
      { path: 'visibilidad-resultados', component: VisibilidadResultados, title: 'Visibilidad de Resultados - Admin' },
      { path: '', redirectTo: 'gestion-tiempos', pathMatch: 'full' }
    ]
  },
  
  // Ruta de login (para admin)
  { path: 'login', component: Login, title: 'Login - Triatlón' },
  
  // Redirección para rutas no encontradas
  { path: '**', redirectTo: '', pathMatch: 'full' }
];
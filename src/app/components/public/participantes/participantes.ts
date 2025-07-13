import { Component, OnInit } from '@angular/core';
import { ParticipantesService } from '../../../services/participantes';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Loading } from '../../shared/loading/loading';

@Component({
  selector: 'app-participantes',
  standalone: true,
  imports: [CommonModule, FormsModule, Loading],
  templateUrl: './participantes.html',
  styleUrls: ['./participantes.scss']
})
export class Participantes implements OnInit {
  participantes: any[] = [];
  participantesFiltrados: any[] = [];
  terminoBusqueda: string = '';
  loading = true;

  constructor(private participantesService: ParticipantesService) {}

  ngOnInit(): void {
    this.cargarParticipantes();
  }

  cargarParticipantes(): void {
    this.participantesService.getParticipantesConEquipos().subscribe({
      next: (participantes) => {
        this.participantes = participantes;
        this.participantesFiltrados = [...participantes];
        this.loading = false;
      },
      error: (error) => {
        console.error('Error al cargar participantes:', error);
        this.loading = false;
      }
    });
  }

  filtrarParticipantes(): void {
    if (!this.terminoBusqueda) {
      this.participantesFiltrados = [...this.participantes];
      return;
    }

    const termino = this.terminoBusqueda.toLowerCase();
    this.participantesFiltrados = this.participantes.filter(p =>
      p.nombre.toLowerCase().includes(termino) ||
      p.equipoNombre?.toLowerCase().includes(termino)
    );
  }

  getIconoDisciplina(disciplina: string): string {
    const iconos: {[key: string]: string} = {
      natacion: 'bi-droplet',
      ciclismo: 'bi-bicycle',
      atletismo: 'bi-person-running'
    };
    return iconos[disciplina] || 'bi-question-circle';
  }
}
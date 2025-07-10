import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { EquiposService } from '../../../services/equipos';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Loading } from '../../shared/loading/loading';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-crear-equipo',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, Loading,FormsModule],
  templateUrl: './crear-equipo.html',
  styleUrls: ['./crear-equipo.scss']
})
export class CrearEquipo implements OnInit {
  equipoForm: FormGroup;
  participantes: any[] = [];
  loading = false;
  disciplinas = ['natacion', 'ciclismo', 'atletismo'];

  constructor(
    private fb: FormBuilder,
    private equiposService: EquiposService,
    private router: Router
  ) {
    this.equipoForm = this.fb.group({
      nombre: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    this.agregarParticipante();
    this.agregarParticipante();
    this.agregarParticipante();
  }

  agregarParticipante(): void {
    this.participantes.push({
      nombre: '',
      genero: 'M',
      disciplina: null,
      tiempo: '00:00:00'
    });
  }

  eliminarParticipante(index: number): void {
    if (this.participantes.length > 3) {
      this.participantes.splice(index, 1);
    }
  }

  async guardarEquipo(): Promise<void> {
    if (this.equipoForm.invalid || this.participantes.length !== 3) {
      alert('Debe completar todos los campos y tener exactamente 3 participantes');
      return;
    }

    // Verificar que todas las disciplinas estén asignadas y sean únicas
    const disciplinasAsignadas = this.participantes.map(p => p.disciplina);
    if (new Set(disciplinasAsignadas).size !== 3 || disciplinasAsignadas.includes(null)) {
      alert('Debe asignar una disciplina diferente a cada participante');
      return;
    }

    this.loading = true;
    try {
      const equipoId = await this.equiposService.addEquipo(this.equipoForm.value);
      
      for (const participante of this.participantes) {
        await this.equiposService.addParticipante(equipoId, participante);
      }
      
      this.router.navigate(['/admin/gestion-tiempos']);
    } catch (error) {
      console.error('Error guardando equipo:', error);
      alert('Error guardando equipo');
    } finally {
      this.loading = false;
    }
  }
}
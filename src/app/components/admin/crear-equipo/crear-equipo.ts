import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { EquiposService } from '../../../services/equipos';
import { Router } from '@angular/router';

@Component({
  selector: 'app-crear-equipo',
  templateUrl: './crear-equipo.html',
  styleUrls: ['./crear-equipo.scss']
})
export class CrearEquipo implements OnInit {
  equipoForm: FormGroup;
  participantes: any[] = [];
  loading = false;

  constructor(
    private fb: FormBuilder,
    private equiposService: EquiposService,
    private router: Router
  ) {
    this.equipoForm = this.fb.group({
      nombre: ['', Validators.required]
    });
  }

  ngOnInit(): void {}

  agregarParticipante(): void {
    this.participantes.push({
      nombre: '',
      genero: 'M',
      disciplina: null,
      tiempo: '00:00:00'
    });
  }

  eliminarParticipante(index: number): void {
    this.participantes.splice(index, 1);
  }

  async guardarEquipo(): Promise<void> {
    if (this.equipoForm.invalid || this.participantes.length !== 3) {
      alert('Debe completar todos los campos y tener exactamente 3 participantes');
      return;
    }

    this.loading = true;
    try {
      const equipoId = await this.equiposService.addEquipo(this.equipoForm.value);
      
      for (const participante of this.participantes) {
        await this.equiposService.addParticipante(equipoId, participante);
      }
      
      this.router.navigate(['/admin']);
    } catch (error) {
      console.error('Error guardando equipo:', error);
      alert('Error guardando equipo');
    } finally {
      this.loading = false;
    }
  }
}
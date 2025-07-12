import { Injectable } from '@angular/core';
import { FirebaseService } from './firebase';
import { Observable } from 'rxjs';
import { Equipo } from '../interfaces/equipo.interface';
import { Participante } from '../interfaces/participante.interface';

@Injectable({ providedIn: 'root' })
export class EquiposService {
  constructor(private firebase: FirebaseService) { }

  getEquipos(): Observable<Equipo[]> {
    return this.firebase.getEquipos();
  }

  getEquipo(id: string): Observable<Equipo | null> {
    return this.firebase.getEquipo(id);
  }

  addEquipo(equipo: Omit<Equipo, 'id'>): Promise<string> {
    return this.firebase.createEquipo(equipo);
  }

  updateEquipo(id: string, data: Partial<Equipo>): Promise<void> {
    return this.firebase.updateEquipo(id, data);
  }

  deleteEquipo(id: string): Promise<void> {
    return this.firebase.deleteEquipo(id);
  }

  getParticipantes(equipoId: string): Observable<Participante[]> {
    return this.firebase.getParticipantes(equipoId);
  }

  addParticipante(equipoId: string, participante: Omit<Participante, 'id'>): Promise<string> {
    return this.firebase.addParticipante(equipoId, participante); // Método correcto
  }

  updateParticipante(equipoId: string, participanteId: string, data: Partial<Participante>): Promise<void> {
    return this.firebase.updateParticipante(equipoId, participanteId, data);
  }

  deleteParticipante(equipoId: string, participanteId: string): Promise<void> {
    return this.firebase.deleteParticipante(equipoId, participanteId);
  }
}
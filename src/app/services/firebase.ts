import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Equipo } from '../interfaces/equipo.interface';
import { Participante } from '../interfaces/participante.interface';
import { Premio } from '../interfaces/premio.interface';

@Injectable({ providedIn: 'root' })
export class FirebaseService {
  constructor(public afs: AngularFirestore) {}

  // Métodos genéricos para equipos
  getEquipos(): Observable<Equipo[]> {
    return this.afs.collection<Equipo>('equipos').snapshotChanges().pipe(
      map(actions => actions.map(a => {
        const data = a.payload.doc.data() as Equipo;
        const id = a.payload.doc.id;
        return { id, ...data };
      }))
    );
  }

  getEquipo(id: string): Observable<Equipo | undefined> {
    return this.afs.doc<Equipo>(`equipos/${id}`).valueChanges().pipe(
      map(equipo => equipo ? { id, ...equipo } : undefined)
    );
  }

  async createEquipo(equipo: Omit<Equipo, 'id'>): Promise<string> {
    const docRef = await this.afs.collection('equipos').add({
      ...equipo,
      createdAt: new Date(),
      visible: true
    });
    return docRef.id;
  }

  updateEquipo(id: string, data: Partial<Equipo>): Promise<void> {
    return this.afs.doc(`equipos/${id}`).update(data);
  }

  deleteEquipo(id: string): Promise<void> {
    return this.afs.doc(`equipos/${id}`).delete();
  }

  // Métodos para participantes
  getParticipantes(equipoId: string): Observable<Participante[]> {
    return this.afs.collection<Participante>(`equipos/${equipoId}/participantes`)
      .valueChanges({ idField: 'id' });
  }

  async createParticipante(equipoId: string, participante: Omit<Participante, 'id'>): Promise<string> {
    const docRef = await this.afs.collection(`equipos/${equipoId}/participantes`).add({
      ...participante,
      equipoId,
      tiempo: participante.tiempo || '00:00:00',
      premio_especial: false,
      penalizado: false
    });
    return docRef.id;
  }

  updateParticipante(equipoId: string, participanteId: string, data: Partial<Participante>): Promise<void> {
    return this.afs.doc(`equipos/${equipoId}/participantes/${participanteId}`).update(data);
  }

  deleteParticipante(equipoId: string, participanteId: string): Promise<void> {
    return this.afs.doc(`equipos/${equipoId}/participantes/${participanteId}`).delete();
  }

  // Métodos para configuración
  getConfiguracion(): Observable<{ resultados_visibles: boolean }> {
    return this.afs.doc<{ resultados_visibles: boolean }>('configuracion/resultados')
      .valueChanges() as Observable<{ resultados_visibles: boolean }>;
  }

  setConfiguracion(visible: boolean): Promise<void> {
    return this.afs.doc('configuracion/resultados').set({
      resultados_visibles: visible,
      ultima_actualizacion: new Date()
    });
  }

  // Métodos adicionales para resultados
  getPremios(): Observable<Premio[]> {
    return this.afs.collection<Premio>('premios').valueChanges({ idField: 'id' });
  }

  getAllParticipantes(): Observable<Participante[]> {
    return this.afs.collectionGroup<Participante>('participantes').valueChanges();
  }
}
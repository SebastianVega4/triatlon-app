import { Injectable } from '@angular/core';
import { AngularFirestore, AngularFirestoreCollection } from '@angular/fire/compat/firestore';
import { Equipo } from '../interfaces/equipo.interface';
import { Participante } from '../interfaces/participante.interface';
import { map } from 'rxjs/operators';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class EquiposService {
  private equiposCollection: AngularFirestoreCollection<Equipo>;

  constructor(private afs: AngularFirestore) {
    this.equiposCollection = this.afs.collection<Equipo>('equipos');
  }

  getEquipos(): Observable<Equipo[]> {
    return this.equiposCollection.snapshotChanges().pipe(
      map(actions => actions.map(a => {
        const data = a.payload.doc.data() as Equipo;
        const id = a.payload.doc.id;
        return { id, ...data };
      }))
    );
  }

  getEquipo(id: string): Observable<Equipo> {
    return this.equiposCollection.doc<Equipo>(id).valueChanges().pipe(
      map(equipo => {
        if (equipo) {
          return { id, ...equipo };
        }
        throw new Error('Equipo no encontrado');
      })
    );
  }

  async addEquipo(equipo: Equipo): Promise<string> {
    const docRef = await this.equiposCollection.add({
      ...equipo,
      createdAt: new Date(),
      visible: true
    });
    return docRef.id;
  }

  updateEquipo(id: string, equipo: Partial<Equipo>): Promise<void> {
    return this.equiposCollection.doc(id).update(equipo);
  }

  deleteEquipo(id: string): Promise<void> {
    return this.equiposCollection.doc(id).delete();
  }

  // Métodos para participantes
  getParticipantes(equipoId: string): Observable<Participante[]> {
    return this.afs.collection<Participante>(`equipos/${equipoId}/participantes`).valueChanges({ idField: 'id' });
  }

  async addParticipante(equipoId: string, participante: Participante): Promise<string> {
    const docRef = await this.afs.collection(`equipos/${equipoId}/participantes`).add({
      ...participante,
      equipoId,
      tiempo: participante.tiempo || '00:00:00',
      premio_especial: false,
      penalizado: false
    });
    return docRef.id;
  }

  updateParticipante(equipoId: string, participanteId: string, participante: Partial<Participante>): Promise<void> {
    return this.afs.doc(`equipos/${equipoId}/participantes/${participanteId}`).update(participante);
  }

  deleteParticipante(equipoId: string, participanteId: string): Promise<void> {
    return this.afs.doc(`equipos/${equipoId}/participantes/${participanteId}`).delete();
  }
}
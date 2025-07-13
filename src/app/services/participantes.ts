import { Injectable } from '@angular/core';
import { Firestore, collectionGroup, doc, docData, collectionData } from '@angular/fire/firestore';
import { Observable, combineLatest, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { Equipo } from '../interfaces/equipo.interface';
import { Participante } from '../interfaces/participante.interface';
import { Premio } from '../interfaces/premio.interface';

@Injectable({
  providedIn: 'root'
})
export class ParticipantesService {
  constructor(private firestore: Firestore) {}

  getParticipantesConEquipos(): Observable<(Participante & { equipoNombre: string })[]> {
    const participantesRef = collectionGroup(this.firestore, 'participantes');
    return (collectionData(participantesRef, { idField: 'id' }) as Observable<Participante[]>).pipe(
      switchMap(participantes => {
        if (participantes.length === 0) {
          return of([]);
        }
        
        return combineLatest(
          participantes.map(p => 
            (docData(doc(this.firestore, `equipos/${p.equipoId}`), { idField: 'id' }) as Observable<Equipo>).pipe(
              map(equipo => ({
                ...p,
                equipoNombre: equipo?.nombre || 'Sin equipo'
              }))
            )
          )
        );
      }),
      map(participantes => 
        participantes.sort((a, b) => a.nombre.localeCompare(b.nombre))
      )
    );
  }
}
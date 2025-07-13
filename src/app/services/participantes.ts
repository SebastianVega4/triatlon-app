import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class ParticipantesService {
  constructor(private firestore: AngularFirestore) {}

  getParticipantes(): Observable<any[]> {
    return this.firestore.collection('participantes').valueChanges({ idField: 'id' }).pipe(
      map(participantes => {
        // Ordenar por nombre
        return participantes.sort((a: any, b: any) => 
          a.nombre.localeCompare(b.nombre))
    })
    );
  }
}
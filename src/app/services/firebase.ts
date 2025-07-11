import { Injectable } from '@angular/core';
import {
  Firestore,
  collection,
  collectionGroup,
  collectionData,
  doc,
  docData,
  addDoc,
  updateDoc,
  deleteDoc,
  setDoc,
  writeBatch,
  query,
  where,
  orderBy,
  limit
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Equipo } from '../interfaces/equipo.interface';
import { Participante } from '../interfaces/participante.interface';
import { Premio } from '../interfaces/premio.interface';

@Injectable({ providedIn: 'root' })
export class FirebaseService {
  constructor(private firestore: Firestore) { }

  // BATCH
  getFirestoreBatch() {
    return writeBatch(this.firestore);
  }

  // REFERENCIAS
  createCollectionRef(collectionPath: string) {
    return collection(this.firestore, collectionPath);
  }

  createCollectionGroupRef<T>(collectionId: string, q?: (ref: any) => any) {
    const base = collectionGroup(this.firestore, collectionId);
    return q ? q(base) : base;
  }

  getDocRef(path: string) {
    return doc(this.firestore, path);
  }

  // EQUIPOS
  getEquipos(): Observable<Equipo[]> {
    const colRef = collection(this.firestore, 'equipos');
    return collectionData(colRef, { idField: 'id' }) as Observable<Equipo[]>;
  }

  getEquipo(id: string): Observable<Equipo | null> {
    const docRef = doc(this.firestore, `equipos/${id}`);
    return docData(docRef, { idField: 'id' }) as Observable<Equipo | null>;
  }

  async createEquipo(equipo: Omit<Equipo, 'id'>): Promise<string> {
    const colRef = collection(this.firestore, 'equipos');
    const docRef = await addDoc(colRef, {
      ...equipo,
      createdAt: new Date(),
      visible: true
    });
    return docRef.id;
  }

  updateEquipo(id: string, data: Partial<Equipo>): Promise<void> {
    const docRef = doc(this.firestore, `equipos/${id}`);
    return updateDoc(docRef, data);
  }

  deleteEquipo(id: string): Promise<void> {
    const docRef = doc(this.firestore, `equipos/${id}`);
    return deleteDoc(docRef);
  }

  // PARTICIPANTES
  getParticipantes(equipoId: string): Observable<Participante[]> {
    const colRef = collection(this.firestore, `equipos/${equipoId}/participantes`);
    return collectionData(colRef, { idField: 'id' }) as Observable<Participante[]>;
  }

  async createParticipante(equipoId: string, participante: Omit<Participante, 'id'>): Promise<string> {
    const colRef = collection(this.firestore, `equipos/${equipoId}/participantes`);
    const docRef = await addDoc(colRef, {
      ...participante,
      equipoId,
      tiempo: participante.tiempo || '00:00:00',
      premio_especial: false,
      penalizado: false
    });
    return docRef.id;
  }

  getParticipante(equipoId: string, participanteId: string): Observable<Participante | null> {
    const docRef = doc(this.firestore, `equipos/${equipoId}/participantes/${participanteId}`);
    return docData(docRef, { idField: 'id' }) as Observable<Participante | null>;
  }

  updateParticipante(equipoId: string, participanteId: string, data: Partial<Participante>): Promise<void> {
    const docRef = doc(this.firestore, `equipos/${equipoId}/participantes/${participanteId}`);
    return updateDoc(docRef, data);
  }

  deleteParticipante(equipoId: string, participanteId: string): Promise<void> {
    const docRef = doc(this.firestore, `equipos/${equipoId}/participantes/${participanteId}`);
    return deleteDoc(docRef);
  }

  // CONFIGURACIÓN
  getConfiguracion(): Observable<{ resultados_visibles: boolean }> {
    const docRef = doc(this.firestore, 'configuracion/resultados');
    return docData(docRef) as Observable<{ resultados_visibles: boolean }>;
  }

  setConfiguracion(visible: boolean): Promise<void> {
    const docRef = doc(this.firestore, 'configuracion/resultados');
    return setDoc(docRef, {
      resultados_visibles: visible,
      ultima_actualizacion: new Date()
    });
  }

  // PREMIOS
  getPremios(): Observable<Premio[]> {
    const colRef = collection(this.firestore, 'premios');
    return collectionData(colRef, { idField: 'id' }) as Observable<Premio[]>;
  }

  getAllParticipantes(): Observable<Participante[]> {
    const groupRef = collectionGroup(this.firestore, 'participantes');
    return collectionData(groupRef) as Observable<Participante[]>;
  }
}

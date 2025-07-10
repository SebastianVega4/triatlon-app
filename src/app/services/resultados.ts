import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Equipo } from '../interfaces/equipo.interface';
import { Participante } from '../interfaces/participante.interface';
import { Premio } from '../interfaces/premio.interface';
import { map, switchMap, take } from 'rxjs/operators';
import { Observable, combineLatest, of } from 'rxjs';
import { EquiposService } from './equipos';
import { subscribe } from 'firebase/data-connect';

@Injectable({
  providedIn: 'root'
})
export class ResultadosService {
  constructor(
    private afs: AngularFirestore,
    private equiposService: EquiposService
  ) { }

  calcularTiempoTotal(equipoId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.afs.collection<Participante>(`equipos/${equipoId}/participantes`).valueChanges().pipe(
        take(1)
          .subscribe(participantes => {
            let totalSegundos = 0;
            let tienePenalizacion = false;

            participantes.forEach(p => {
              if (p.penalizado) {
                tienePenalizacion = true;
              }
              const tiempo = p.tiempo || '00:00:00';
              const [hh, mm, ss] = tiempo.split(':').map(Number);
              totalSegundos += hh * 3600 + mm * 60 + ss;
            });

            // Convertir segundos a HH:MM:SS
            const horas = Math.floor(totalSegundos / 3600);
            const minutos = Math.floor((totalSegundos % 3600) / 60);
            const segundos = totalSegundos % 60;
            const tiempoTotal = `${this.pad(horas)}:${this.pad(minutos)}:${this.pad(segundos)}`;

            this.afs.doc(`equipos/${equipoId}`).update({
              tiempo_total: tiempoTotal,
              penalizacion: tienePenalizacion
            }).then(() => resolve())
              .catch(error => reject(error));
          }));
    });
  }

  private pad(num: number): string {
    return num < 10 ? `0${num}` : num.toString();
  }

  actualizarPosiciones(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.afs.collection<Equipo>('equipos', ref => ref.orderBy('tiempo_total')).snapshotChanges().pipe(
        take(1)
          .subscribe(snapshot => {
            const batch = this.afs.firestore.batch();

            snapshot.forEach((doc, index) => {
              const equipoRef = this.afs.doc(`equipos/${doc.payload.doc.id}`).ref;
              batch.update(equipoRef, { posicion: index + 1 });
            });

            batch.commit().then(() => resolve())
              .catch(error => reject(error));
          }));
    });
  }

  calcularPremios(): Promise<void> {
    return new Promise((resolve, reject) => {
      combineLatest([
        this.afs.collection<Equipo>('equipos', ref => ref.orderBy('tiempo_total').limit(3)).valueChanges(),
        this.afs.collectionGroup<Participante>('participantes').valueChanges()
      ]).pipe(take(1)).subscribe(([equiposPodio, todosParticipantes]) => {
        const idsEquiposPodio = equiposPodio.map(e => e.id);
        const participantesElegibles = todosParticipantes.filter(p => !idsEquiposPodio.includes(p.equipoId));

        const categorias = [
          { nombre: 'mejor_mujer_natacion', genero: 'F', disciplina: 'natacion' },
          { nombre: 'mejor_hombre_natacion', genero: 'M', disciplina: 'natacion' },
          { nombre: 'mejor_mujer_ciclismo', genero: 'F', disciplina: 'ciclismo' },
          { nombre: 'mejor_hombre_ciclismo', genero: 'M', disciplina: 'ciclismo' },
          { nombre: 'mejor_mujer_atletismo', genero: 'F', disciplina: 'atletismo' },
          { nombre: 'mejor_hombre_atletismo', genero: 'M', disciplina: 'atletismo' }
        ];

        const batch = this.afs.firestore.batch();
        const premiosRef = this.afs.collection('premios');

        // Limpiar premios anteriores
        this.afs.collection('premios').get().pipe(take(1)).subscribe(snapshot => {
          snapshot.forEach(doc => {
            batch.delete(doc.ref);
          });

          // Calcular nuevos premios
          categorias.forEach(cat => {
            const participantesCat = participantesElegibles.filter(
              p => p.genero === cat.genero && p.disciplina === cat.disciplina && p.tiempo && p.tiempo !== '00:00:00'
            );

            if (participantesCat.length > 0) {
              const mejor = participantesCat.sort((a, b) =>
                this.compararTiempos(a.tiempo, b.tiempo)
              )[0];

              const nuevoPremio: Premio = {
                categoria: cat.nombre,
                participante_id: mejor.id,
                equipo_id: mejor.equipoId,
                tiempo: mejor.tiempo,
                nombre_participante: mejor.nombre,
                nombre_equipo: '' // Se puede completar después
              };

              batch.set(premiosRef.doc().ref, nuevoPremio);
            }
          });

          batch.commit().then(() => resolve())
            .catch(error => reject(error));
        });
      });
    });
  }

  compararTiempos(tiempoA: string, tiempoB: string): number {
    const [hhA, mmA, ssA] = tiempoA.split(':').map(Number);
    const [hhB, mmB, ssB] = tiempoB.split(':').map(Number);

    const totalA = hhA * 3600 + mmA * 60 + ssA;
    const totalB = hhB * 3600 + mmB * 60 + ssB;

    return totalA - totalB;
  }

  aplicarPenalizacion(equipoId: string, disciplina: 'natacion' | 'ciclismo' | 'atletismo'): Promise<void> {
    return new Promise((resolve, reject) => {
      this.afs.collection<Participante>(`equipos/${equipoId}/participantes`,
        ref => ref.where('disciplina', '==', disciplina))
        .get().pipe(take(1)).subscribe(snapshot => {
          if (snapshot.empty) {
            reject(new Error('No se encontró participante para esta disciplina'));
            return;
          }

          const participante = snapshot.docs[0].data() as Participante;
          const participanteId = snapshot.docs[0].id;

          // Obtener el último tiempo de la disciplina
          this.afs.collectionGroup<Participante>('participantes',
            ref => ref.where('disciplina', '==', disciplina)
              .orderBy('tiempo', 'desc')
              .limit(1))
            .get().pipe(take(1)).subscribe(lastSnapshot => {
              if (lastSnapshot.empty) {
                reject(new Error('No hay participantes en esta disciplina'));
                return;
              }

              const ultimoTiempo = lastSnapshot.docs[0].data().tiempo;
              const [hh, mm, ss] = ultimoTiempo.split(':').map(Number);
              const totalSegundos = hh * 3600 + mm * 60 + ss + 300; // +5 minutos

              const nuevasHoras = Math.floor(totalSegundos / 3600);
              const nuevosMinutos = Math.floor((totalSegundos % 3600) / 60);
              const nuevosSegundos = totalSegundos % 60;
              const nuevoTiempo = `${this.pad(nuevasHoras)}:${this.pad(nuevosMinutos)}:${this.pad(nuevosSegundos)}`;

              // Actualizar participante
              this.afs.doc(`equipos/${equipoId}/participantes/${participanteId}`).update({
                tiempo: nuevoTiempo,
                penalizado: true
              }).then(() => {
                // Actualizar bandera de penalización en el equipo
                const campoPenalizacion = `penalizacion_${disciplina}`;
                this.afs.doc(`equipos/${equipoId}`).update({
                  [campoPenalizacion]: true
                }).then(() => resolve())
                  .catch(error => reject(error));
              })
                .catch(error => reject(error));
            });
        });
    });
  }

  getPremios(): Observable<Premio[]> {
    return this.afs.collection<Premio>('premios').valueChanges({ idField: 'id' });
  }

  setPremioEspecial(participanteId: string, equipoId: string): Promise<void> {
    // Primero, quitar premio especial de cualquier otro participante
    return new Promise((resolve, reject) => {
      this.afs.collectionGroup<Participante>('participantes',
        ref => ref.where('premio_especial', '==', true))
        .get().pipe(take(1)).subscribe(snapshot => {
          const batch = this.afs.firestore.batch();

          snapshot.forEach(doc => {
            batch.update(doc.ref, { premio_especial: false });
          });

          // Asignar nuevo premio especial
          batch.update(
            this.afs.doc(`equipos/${equipoId}/participantes/${participanteId}`).ref,
            { premio_especial: true }
          );

          batch.commit().then(() => resolve())
            .catch(error => reject(error));
        });
    });
  }

  toggleVisibilidadResultados(visible: boolean): Promise<void> {
    return this.afs.doc('configuracion/resultados').set({
      resultados_visibles: visible,
      ultima_actualizacion: new Date()
    });
  }

  getVisibilidadResultados(): Observable<boolean> {
    return this.afs.doc<{ resultados_visibles: boolean }>('configuracion/resultados').valueChanges().pipe(
      map(config => config?.resultados_visibles ?? true)
    );
  }
}

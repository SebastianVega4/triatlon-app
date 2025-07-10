import { Injectable } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  constructor(private afAuth: AngularFireAuth, private router: Router) {}

  async login(email: string, password: string): Promise<boolean> {
    try {
      const result = await this.afAuth.signInWithEmailAndPassword(email, password);
      return !!result.user;
    } catch (error) {
      console.error('Error en login:', error);
      return false;
    }
  }

  logout(): void {
    this.afAuth.signOut().then(() => {
      this.router.navigate(['/public']);
    });
  }

  getCurrentUser() {
    return this.afAuth.authState;
  }
}
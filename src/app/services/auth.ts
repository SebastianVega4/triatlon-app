import { Injectable } from '@angular/core';
import {
  Auth,
  signInWithEmailAndPassword,
  signOut,
  authState
} from '@angular/fire/auth';
import { Router } from '@angular/router';

@Injectable({ providedIn: 'root' })
export class AuthService {
  constructor(private auth: Auth, private router: Router) {}

  async login(email: string, password: string): Promise<boolean> {
    try {
      const result = await signInWithEmailAndPassword(this.auth, email, password);
      return !!result.user;
    } catch (error) {
      console.error('Error en login:', error);
      return false;
    }
  }

  logout(): Promise<void> {
    return signOut(this.auth).then(() => {
      this.router.navigate(['/login']);
    });
  }

  getCurrentUser() {
    return authState(this.auth);
  }
}

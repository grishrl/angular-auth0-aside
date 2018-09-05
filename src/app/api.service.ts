import { Injectable } from '@angular/core';
import { throwError, Observable } from 'rxjs';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { catchError, switchMap } from 'rxjs/operators';
import { AuthService } from './auth/auth.service';

@Injectable()
export class ApiService {
  private _baseUrl = 'http://localhost:3001/api/';

  constructor(
    private http: HttpClient,
    private auth: AuthService
  ) { }

  getDragons$(): Observable<any[]> {
    return this.auth.token$.pipe(
      switchMap(
        token => {
          return this.http.get<any[]>(`${this._baseUrl}dragons`, {
            headers: new HttpHeaders().set(
              'Authorization', `Bearer ${token}`
            )
          }).pipe(
            catchError(this._handleError)
          )
        }
      )
    )
  }

  private _handleError(err: HttpErrorResponse | any) {
    const errorMsg = err.message || 'Unable to retrieve data';
    return throwError(errorMsg);
  }

}

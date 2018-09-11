import { Injectable } from '@angular/core';
import { HttpRequest, HttpHandler, HttpEvent, HttpInterceptor } from '@angular/common/http';
import { AuthService } from './auth.service';
import { Observable } from 'rxjs';
import { mergeMap } from 'rxjs/operators';

@Injectable()
export class InterceptorService implements HttpInterceptor {
  constructor(private auth: AuthService) { }

  intercept(
    req: HttpRequest<any>,
    next: HttpHandler
  ): Observable<HttpEvent<any>> {
    return this.auth.tokenData$
      .pipe(
        mergeMap(tokenData => {
          if (tokenData.accessToken) {
            const tokenReq = req.clone({
              setHeaders: { Authorization: `Bearer ${tokenData.accessToken}` }
            });
            return next.handle(tokenReq);
          }
        })
      );
  }
}

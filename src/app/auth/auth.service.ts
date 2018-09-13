import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, bindNodeCallback, of, timer, Subscription } from 'rxjs';
import { mergeMap } from 'rxjs/operators';
import * as auth0 from 'auth0-js';
import { environment } from './../../environments/environment';
import { Router } from '@angular/router';
import { TokenData } from './tokendata.model';

@Injectable()
export class AuthService {
  // Create Auth0 web auth instance
  // @TODO: Update environment variables and remove .example
  // extension in src/environments/environment.ts.example
  private _Auth0 = new auth0.WebAuth({
    clientID: environment.auth.CLIENT_ID,
    domain: environment.auth.CLIENT_DOMAIN,
    responseType: 'id_token token',
    redirectUri: environment.auth.REDIRECT,
    audience: environment.auth.AUDIENCE,
    scope: 'openid profile email'
  });
  // Track whether or not to renew token
  private _authFlag = 'isLoggedIn';
  // Create streams for authentication data
  tokenData$ = new BehaviorSubject<TokenData>(new TokenData());
  userProfile$ = new BehaviorSubject<any>(null);
  // Authentication navigation
  onAuthSuccessUrl = '/';
  onAuthFailureUrl = '/';
  logoutUrl = environment.auth.LOGOUT_URL;
  // Silent token renewal
  refreshSub: Subscription;
  private _expiresAt: number;

  // Create observable of Auth0 parseHash method to gather auth results
  parseHash$ = bindNodeCallback(this._Auth0.parseHash.bind(this._Auth0));

  // Create observable of Auth0 checkSession method to
  // verify authorization server session and renew tokens
  checkSession$ = bindNodeCallback(this._Auth0.checkSession.bind(this._Auth0));

  // Create observable of token
  // This is important for the token interceptor
  // which should receive a non-null initial value
  // once the appropriate value is available
  token$: Observable<string>;

  constructor(private router: Router) { }

  login() {
    this._Auth0.authorize();
  }

  handleLoginCallback() {
    if (window.location.hash && !this.authenticated) {
      this.parseHash$().subscribe(
        authResult => {
          this._setAuth(authResult);
          window.location.hash = '';
          this._navigateAfterHashParse();
        },
        err => this._handleAuthError(err)
      );
    }
  }

  // When trying to access a protected route,
  // user will be prompted to log in
  private _navigateAfterHashParse() {
    const authRedirect = localStorage.getItem('authRedirect');
    if (authRedirect) {
      this.router.navigateByUrl(authRedirect);
      localStorage.removeItem('authRedirect');
    } else {
      this.router.navigate([this.onAuthSuccessUrl]);
    }
  }

  private _setAuth(authResult) {
    this._expiresAt = authResult.expiresIn * 1000 + Date.now();
    // Create observable of valid token
    this.token$ = of(authResult.accessToken);
    // Emit values for auth data subjects
    this.tokenData$.next({
      expiresAt: this._expiresAt,
      accessToken: authResult.accessToken
    });
    this.userProfile$.next(authResult.idTokenPayload);
    // Set flag in local storage stating this app is logged in
    localStorage.setItem(this._authFlag, JSON.stringify(true));
    // Schedule silent auth renewal
    this.scheduleRenewal();
  }

  get authenticated(): boolean {
    return JSON.parse(localStorage.getItem(this._authFlag));
  }

  renewAuth() {
    if (this.authenticated) {
      this.checkSession$({}).subscribe(
        authResult => this._setAuth(authResult),
        err => {
          localStorage.removeItem(this._authFlag);
          this.router.navigate([this.onAuthFailureUrl]);
          this.unscheduleRenewal();
        }
      );
    }
  }

  logout() {
    // Set authentication status flag in local storage to false
    localStorage.setItem(this._authFlag, JSON.stringify(false));
    // This does a refresh and redirects back to homepage
    // Make sure you have the logout URL in your Auth0
    // Dashboard Application settings in Allowed Logout URLs
    this._Auth0.logout({
      returnTo: this.logoutUrl,
      clientID: environment.auth.CLIENT_ID
    });
  }

  private _handleAuthError(err) {
    if (err.error_description) {
      console.error(`Error: ${err.error_description}`);
    } else {
      console.error(`Error: ${JSON.stringify(err)}`);
    }
    this.router.navigate([this.onAuthFailureUrl]);
  }

  // Silent auth renewal: schedule to renew
  // auth if token expires during browser session
  scheduleRenewal() {
    // If app doesn't think user is authorized, do nothing
    if (!this.authenticated) { return; }
    // Unsubscribe from previous expiration observable
    this.unscheduleRenewal();
    // Create and subscribe to expiration observable
    const expiresIn$ = of(this._expiresAt).pipe(
      mergeMap(
        expires => {
          const now = Date.now();
          // Use timer to track delay until expiration
          // to run the refresh at the proper time
          return timer(Math.max(1, expires - now));
        }
      )
    );

    this.refreshSub = expiresIn$.subscribe(
      () => this.renewAuth()
    );
  }

  unscheduleRenewal() {
    if (this.refreshSub) {
      this.refreshSub.unsubscribe();
    }
  }

  storeAuthRedirect(url: string) {
    localStorage.setItem('authRedirect', url);
  }

}

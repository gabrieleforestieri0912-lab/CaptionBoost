/**
 * Modulo Autenticazione - Supporta login con codice email
 * Gestisce sessioni, token e persistenza dell'autenticazione
 */

class AuthManager {
  constructor() {
    this.apiUrl = "http://localhost:3000/api/auth";
    this.redirectUri = chrome.identity.getRedirectURL();
    this.tokenKey = "captionboost_auth_token";
    this.userKey = "captionboost_user";
    this._initApiUrl()
  }

  async _initApiUrl() {
    try {
      const result = await chrome.storage.local.get(['apiUrl'])
      if (result.apiUrl) {
        this.apiUrl = `${result.apiUrl.replace(/\/+$/, '')}/api/auth`
      }
    } catch {}
  }

  /**
   * Login con email e password
   */
  async loginWithEmail(email, password) {
    try {
      const response = await fetch(`${this.apiUrl}/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Errore di login");
      }

      const data = await response.json();
      await this._saveAuthData(data);

      console.log("✅ Login con email riuscito:", email);
      return { success: true, user: data.user };
    } catch (error) {
      console.error("❌ Errore login email:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Richiede invio codice di accesso via email (OTP)
   */
  async requestLoginCode(email) {
    try {
      const response = await fetch(`${this.apiUrl}/login-code/request`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Errore invio codice");
      }

      return { success: true };
    } catch (error) {
      console.error("❌ Errore invio codice login:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Verifica codice OTP email e completa il login
   */
  async loginWithEmailCode(email, code) {
    try {
      const response = await fetch(`${this.apiUrl}/login-code/verify`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, code }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Codice non valido o scaduto");
      }

      const data = await response.json();
      await this._saveAuthData(data);

      console.log("✅ Login con codice email riuscito:", email);
      return { success: true, user: data.user };
    } catch (error) {
      console.error("❌ Errore verifica codice login:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Registrazione con email e password
   */
  async registerWithEmail(email, password, name) {
    try {
      // Validazione password
      if (password.length < 8) {
        throw new Error("La password deve avere almeno 8 caratteri");
      }

      const response = await fetch(`${this.apiUrl}/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password, name }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Errore di registrazione");
      }

      const data = await response.json();
      await this._saveAuthData(data);

      console.log("✅ Registrazione completata:", email);
      return { success: true, user: data.user };
    } catch (error) {
      console.error("❌ Errore registrazione:", error);
      return { success: false, error: error.message };
    }
  }


  /**
   * Logout
   */
  async logout() {
    try {
      const token = await this._getToken();

      // Informa il backend del logout
      if (token) {
        await fetch(`${this.apiUrl}/logout`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });
      }

      // Pulisci i dati locali
      await chrome.storage.local.remove([this.tokenKey, this.userKey]);

      console.log("✅ Logout completato");
      return { success: true };
    } catch (error) {
      console.error("⚠️ Errore logout:", error);
      // Comunque pulisci i dati locali
      await chrome.storage.local.remove([this.tokenKey, this.userKey]);
      return { success: true };
    }
  }

  /**
   * Ottieni l'utente autenticato
   */
  async getAuthenticatedUser() {
    try {
      const user = await this._getUser();
      if (!user) return null;

      // Verifica se il token è ancora valido
      const isValid = await this._verifyToken();
      if (!isValid) {
        // Prova a rinnovare il token
        const refreshed = await this._refreshToken();
        if (!refreshed) {
          await this.logout();
          return null;
        }
      }

      return user;
    } catch (error) {
      console.error("❌ Errore nel recupero utente:", error);
      return null;
    }
  }

  /**
   * Verifica se l'utente è autenticato
   */
  async isAuthenticated() {
    const user = await this.getAuthenticatedUser();
    return user !== null;
  }

  /**
   * Rinfresca il token di accesso
   */
  async _refreshToken() {
    try {
      const token = await this._getToken();
      if (!token) return false;

      const response = await fetch(`${this.apiUrl}/refresh`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        return false;
      }

      const data = await response.json();
      await this._saveToken(data.token);

      console.log("🔄 Token rinnovato");
      return true;
    } catch (error) {
      console.error("❌ Errore nel rinnovamento del token:", error);
      return false;
    }
  }

  /**
   * Verifica se il token è valido
   */
  async _verifyToken() {
    try {
      const token = await this._getToken();
      if (!token) return false;

      const response = await fetch(`${this.apiUrl}/verify`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      return response.ok;
    } catch (error) {
      console.error("❌ Errore nella verifica del token:", error);
      return false;
    }
  }

  /**
   * Salva i dati di autenticazione
   */
  async _saveAuthData(data) {
    await this._saveToken(data.token);
    await this._saveUser(data.user);
  }

  /**
   * Salva il token
   */
  async _saveToken(token) {
    await chrome.storage.local.set({ [this.tokenKey]: token });
  }

  /**
   * Salva i dati dell'utente
   */
  async _saveUser(user) {
    await chrome.storage.local.set({ [this.userKey]: user });
  }

  /**
   * Ottieni il token
   */
  async _getToken() {
    return new Promise((resolve) => {
      chrome.storage.local.get([this.tokenKey], (result) => {
        resolve(result[this.tokenKey] || null);
      });
    });
  }

  /**
   * Ottieni l'utente
   */
  async _getUser() {
    return new Promise((resolve) => {
      chrome.storage.local.get([this.userKey], (result) => {
        resolve(result[this.userKey] || null);
      });
    });
  }

  /**
   * Cambia password
   */
  async changePassword(currentPassword, newPassword) {
    try {
      const token = await this._getToken();
      if (!token) {
        throw new Error("Non autenticato");
      }

      if (newPassword.length < 8) {
        throw new Error("La nuova password deve avere almeno 8 caratteri");
      }

      const response = await fetch(`${this.apiUrl}/change-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Errore nel cambio password");
      }

      console.log("✅ Password cambiata");
      return { success: true };
    } catch (error) {
      console.error("❌ Errore cambio password:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Richiedi reset password
   */
  async requestPasswordReset(email) {
    try {
      const response = await fetch(`${this.apiUrl}/forgot-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Errore nella richiesta");
      }

      console.log("✅ Email di reset inviata a:", email);
      return { success: true };
    } catch (error) {
      console.error("❌ Errore richiesta reset:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Verifica email
   */
  async verifyEmail(token) {
    try {
      const response = await fetch(`${this.apiUrl}/verify-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Errore nella verifica");
      }

      console.log("✅ Email verificata");
      return { success: true };
    } catch (error) {
      console.error("❌ Errore verifica email:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Ottieni il token per richieste API autenticate
   */
  async getAuthHeader() {
    const token = await this._getToken();
    return {
      Authorization: `Bearer ${token}`,
    };
  }
}

// Istanza globale
const authManager = new AuthManager();

// Esporta globalmente per il contesto del browser
if (typeof window !== "undefined") {
  window.authManager = authManager;
}

// Esporta per Node.js
if (typeof module !== "undefined" && module.exports) {
  module.exports = { AuthManager, authManager };
}

import {
  CognitoIdentityProviderClient,
  GlobalSignOutCommand,
  InitiateAuthCommand
} from "@aws-sdk/client-cognito-identity-provider";

import type { AppEnv } from "../config/env.js";

export type AuthTokens = {
  accessToken: string;
  idToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
};

export class AuthServiceError extends Error {
  constructor(
    public readonly code: "invalid_credentials" | "unauthorized" | "not_configured" | "unknown",
    message: string
  ) {
    super(message);
  }
}

export class CognitoAuthService {
  private readonly client: CognitoIdentityProviderClient | null;

  constructor(private readonly env: AppEnv) {
    this.client = this.isConfigured()
      ? new CognitoIdentityProviderClient({
          region: env.AWS_REGION
        })
      : null;
  }

  isConfigured(): boolean {
    return Boolean(
      this.env.COGNITO_AUTH_ENABLED &&
        this.env.COGNITO_USER_POOL_ID &&
        this.env.COGNITO_APP_CLIENT_ID
    );
  }

  async login(email: string, password: string): Promise<AuthTokens> {
    if (!this.isConfigured()) {
      throw new AuthServiceError("not_configured", "autenticacao cognito nao configurada");
    }
    if (!this.client) {
      throw new AuthServiceError("not_configured", "cliente cognito nao configurado");
    }

    try {
      const response = await this.client.send(
        new InitiateAuthCommand({
          AuthFlow: "USER_PASSWORD_AUTH",
          ClientId: this.env.COGNITO_APP_CLIENT_ID,
          AuthParameters: {
            USERNAME: email,
            PASSWORD: password
          }
        })
      );

      const authResult = response.AuthenticationResult;
      if (
        !authResult?.AccessToken ||
        !authResult.IdToken ||
        !authResult.RefreshToken ||
        !authResult.ExpiresIn ||
        !authResult.TokenType
      ) {
        throw new AuthServiceError("unknown", "resposta de autenticacao incompleta");
      }

      return {
        accessToken: authResult.AccessToken,
        idToken: authResult.IdToken,
        refreshToken: authResult.RefreshToken,
        expiresIn: authResult.ExpiresIn,
        tokenType: authResult.TokenType
      };
    } catch (error) {
      const asError = error as { name?: string; message?: string };
      if (
        asError?.name === "NotAuthorizedException" ||
        asError?.name === "UserNotFoundException" ||
        asError?.name === "UserNotConfirmedException"
      ) {
        throw new AuthServiceError("invalid_credentials", "credenciais invalidas");
      }
      throw new AuthServiceError("unknown", asError?.message ?? "falha no login");
    }
  }

  async refresh(refreshToken: string): Promise<Omit<AuthTokens, "refreshToken">> {
    if (!this.isConfigured()) {
      throw new AuthServiceError("not_configured", "autenticacao cognito nao configurada");
    }
    if (!this.client) {
      throw new AuthServiceError("not_configured", "cliente cognito nao configurado");
    }

    try {
      const response = await this.client.send(
        new InitiateAuthCommand({
          AuthFlow: "REFRESH_TOKEN_AUTH",
          ClientId: this.env.COGNITO_APP_CLIENT_ID,
          AuthParameters: {
            REFRESH_TOKEN: refreshToken
          }
        })
      );

      const authResult = response.AuthenticationResult;
      if (!authResult?.AccessToken || !authResult?.IdToken || !authResult?.ExpiresIn || !authResult?.TokenType) {
        throw new AuthServiceError("unknown", "resposta de refresh incompleta");
      }

      return {
        accessToken: authResult.AccessToken,
        idToken: authResult.IdToken,
        expiresIn: authResult.ExpiresIn,
        tokenType: authResult.TokenType
      };
    } catch (error) {
      const asError = error as { name?: string; message?: string };
      if (asError?.name === "NotAuthorizedException") {
        throw new AuthServiceError("unauthorized", "refresh token invalido");
      }
      throw new AuthServiceError("unknown", asError?.message ?? "falha no refresh");
    }
  }

  async logout(accessToken: string): Promise<void> {
    if (!this.isConfigured()) {
      throw new AuthServiceError("not_configured", "autenticacao cognito nao configurada");
    }
    if (!this.client) {
      throw new AuthServiceError("not_configured", "cliente cognito nao configurado");
    }

    try {
      await this.client.send(
        new GlobalSignOutCommand({
          AccessToken: accessToken
        })
      );
    } catch (error) {
      const asError = error as { name?: string; message?: string };
      if (asError?.name === "NotAuthorizedException") {
        throw new AuthServiceError("unauthorized", "token invalido para logout");
      }
      throw new AuthServiceError("unknown", asError?.message ?? "falha no logout");
    }
  }
}

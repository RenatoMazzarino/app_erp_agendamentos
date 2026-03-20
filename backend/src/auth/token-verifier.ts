import { CognitoJwtVerifier } from "aws-jwt-verify";
import type { JwtPayload } from "aws-jwt-verify/jwt-model";

import type { AppEnv } from "../config/env.js";

export type AuthContext = {
  subject: string;
  email: string | null;
  username: string | null;
  tenantSlug: string | null;
  claims: JwtPayload;
};

export class TokenVerifier {
  private readonly verifier: ReturnType<typeof CognitoJwtVerifier.create> | null;

  constructor(private readonly env: AppEnv) {
    if (!this.isConfigured()) {
      this.verifier = null;
      return;
    }

    this.verifier = CognitoJwtVerifier.create({
      userPoolId: env.COGNITO_USER_POOL_ID!,
      tokenUse: "access",
      clientId: env.COGNITO_APP_CLIENT_ID!
    });
  }

  isConfigured(): boolean {
    return Boolean(
      this.env.COGNITO_AUTH_ENABLED &&
        this.env.COGNITO_USER_POOL_ID &&
        this.env.COGNITO_APP_CLIENT_ID
    );
  }

  async verifyAccessToken(token: string): Promise<AuthContext> {
    if (!this.verifier) {
      throw new Error("token verifier nao configurado");
    }

    const payload = await this.verifier.verify(token);

    return {
      subject: (payload.sub as string | undefined) ?? "unknown",
      email: (payload.email as string | undefined) ?? null,
      username: (payload.username as string | undefined) ?? null,
      tenantSlug: (payload["custom:tenant_slug"] as string | undefined) ?? null,
      claims: payload
    };
  }
}

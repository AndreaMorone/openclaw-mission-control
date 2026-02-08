"use client";

export const dynamic = "force-dynamic";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { SignedIn, SignedOut, useAuth } from "@/auth/clerk";

import { ApiError } from "@/api/mutator";
import { useCreateGatewayApiV1GatewaysPost } from "@/api/generated/gateways/gateways";
import { useOrganizationMembership } from "@/lib/use-organization-membership";
import { AdminOnlyNotice } from "@/components/auth/AdminOnlyNotice";
import { SignedOutPanel } from "@/components/auth/SignedOutPanel";
import { GatewayForm } from "@/components/gateways/GatewayForm";
import { DashboardSidebar } from "@/components/organisms/DashboardSidebar";
import { DashboardShell } from "@/components/templates/DashboardShell";
import {
  DEFAULT_MAIN_SESSION_KEY,
  DEFAULT_WORKSPACE_ROOT,
  checkGatewayConnection,
  type GatewayCheckStatus,
  validateGatewayUrl,
} from "@/lib/gateway-form";

export default function NewGatewayPage() {
  const { isSignedIn } = useAuth();
  const router = useRouter();

  const { isAdmin } = useOrganizationMembership(isSignedIn);

  const [name, setName] = useState("");
  const [gatewayUrl, setGatewayUrl] = useState("");
  const [gatewayToken, setGatewayToken] = useState("");
  const [mainSessionKey, setMainSessionKey] = useState(
    DEFAULT_MAIN_SESSION_KEY,
  );
  const [workspaceRoot, setWorkspaceRoot] = useState(DEFAULT_WORKSPACE_ROOT);

  const [gatewayUrlError, setGatewayUrlError] = useState<string | null>(null);
  const [gatewayCheckStatus, setGatewayCheckStatus] =
    useState<GatewayCheckStatus>("idle");
  const [gatewayCheckMessage, setGatewayCheckMessage] = useState<string | null>(
    null,
  );

  const [error, setError] = useState<string | null>(null);

  const createMutation = useCreateGatewayApiV1GatewaysPost<ApiError>({
    mutation: {
      onSuccess: (result) => {
        if (result.status === 200) {
          router.push(`/gateways/${result.data.id}`);
        }
      },
      onError: (err) => {
        setError(err.message || "Something went wrong.");
      },
    },
  });

  const isLoading = createMutation.isPending;

  const canSubmit =
    Boolean(name.trim()) &&
    Boolean(gatewayUrl.trim()) &&
    Boolean(mainSessionKey.trim()) &&
    Boolean(workspaceRoot.trim()) &&
    gatewayCheckStatus === "success";

  const runGatewayCheck = async () => {
    const validationError = validateGatewayUrl(gatewayUrl);
    setGatewayUrlError(validationError);
    if (validationError) {
      setGatewayCheckStatus("error");
      setGatewayCheckMessage(validationError);
      return;
    }
    if (!isSignedIn) return;
    setGatewayCheckStatus("checking");
    setGatewayCheckMessage(null);
    const { ok, message } = await checkGatewayConnection({
      gatewayUrl,
      gatewayToken,
      mainSessionKey,
    });
    setGatewayCheckStatus(ok ? "success" : "error");
    setGatewayCheckMessage(message);
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isSignedIn) return;

    if (!name.trim()) {
      setError("Gateway name is required.");
      return;
    }
    const gatewayValidation = validateGatewayUrl(gatewayUrl);
    setGatewayUrlError(gatewayValidation);
    if (gatewayValidation) {
      setGatewayCheckStatus("error");
      setGatewayCheckMessage(gatewayValidation);
      return;
    }
    if (!mainSessionKey.trim()) {
      setError("Main session key is required.");
      return;
    }
    if (!workspaceRoot.trim()) {
      setError("Workspace root is required.");
      return;
    }

    setError(null);
    createMutation.mutate({
      data: {
        name: name.trim(),
        url: gatewayUrl.trim(),
        token: gatewayToken.trim() || null,
        main_session_key: mainSessionKey.trim(),
        workspace_root: workspaceRoot.trim(),
      },
    });
  };

  return (
    <DashboardShell>
      <SignedOut>
        <SignedOutPanel
          message="Sign in to create a gateway."
          forceRedirectUrl="/gateways/new"
        />
      </SignedOut>
      <SignedIn>
        <DashboardSidebar />
        <main className="flex-1 overflow-y-auto bg-slate-50">
          <div className="border-b border-slate-200 bg-white px-8 py-6">
            <div>
              <h1 className="font-heading text-2xl font-semibold text-slate-900 tracking-tight">
                Create gateway
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Configure an OpenClaw gateway for mission control.
              </p>
            </div>
          </div>

          <div className="p-8">
            {!isAdmin ? (
              <AdminOnlyNotice message="Only organization owners and admins can create gateways." />
            ) : (
              <GatewayForm
                name={name}
                gatewayUrl={gatewayUrl}
                gatewayToken={gatewayToken}
                mainSessionKey={mainSessionKey}
                workspaceRoot={workspaceRoot}
                gatewayUrlError={gatewayUrlError}
                gatewayCheckStatus={gatewayCheckStatus}
                gatewayCheckMessage={gatewayCheckMessage}
                errorMessage={error}
                isLoading={isLoading}
                canSubmit={canSubmit}
                mainSessionKeyPlaceholder={DEFAULT_MAIN_SESSION_KEY}
                workspaceRootPlaceholder={DEFAULT_WORKSPACE_ROOT}
                cancelLabel="Cancel"
                submitLabel="Create gateway"
                submitBusyLabel="Creating…"
                onSubmit={handleSubmit}
                onCancel={() => router.push("/gateways")}
                onRunGatewayCheck={runGatewayCheck}
                onNameChange={setName}
                onGatewayUrlChange={(next) => {
                  setGatewayUrl(next);
                  setGatewayUrlError(null);
                  setGatewayCheckStatus("idle");
                  setGatewayCheckMessage(null);
                }}
                onGatewayTokenChange={(next) => {
                  setGatewayToken(next);
                  setGatewayCheckStatus("idle");
                  setGatewayCheckMessage(null);
                }}
                onMainSessionKeyChange={(next) => {
                  setMainSessionKey(next);
                  setGatewayCheckStatus("idle");
                  setGatewayCheckMessage(null);
                }}
                onWorkspaceRootChange={setWorkspaceRoot}
              />
            )}
          </div>
        </main>
      </SignedIn>
    </DashboardShell>
  );
}

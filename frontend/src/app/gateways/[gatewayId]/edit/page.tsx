"use client";

export const dynamic = "force-dynamic";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";

import { SignedIn, SignedOut, useAuth } from "@/auth/clerk";

import { ApiError } from "@/api/mutator";
import {
  type getGatewayApiV1GatewaysGatewayIdGetResponse,
  useGetGatewayApiV1GatewaysGatewayIdGet,
  useUpdateGatewayApiV1GatewaysGatewayIdPatch,
} from "@/api/generated/gateways/gateways";
import { useOrganizationMembership } from "@/lib/use-organization-membership";
import type { GatewayUpdate } from "@/api/generated/model";
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

export default function EditGatewayPage() {
  const { isSignedIn } = useAuth();
  const router = useRouter();
  const params = useParams();
  const gatewayIdParam = params?.gatewayId;
  const gatewayId = Array.isArray(gatewayIdParam)
    ? gatewayIdParam[0]
    : gatewayIdParam;

  const { isAdmin } = useOrganizationMembership(isSignedIn);

  const [name, setName] = useState<string | undefined>(undefined);
  const [gatewayUrl, setGatewayUrl] = useState<string | undefined>(undefined);
  const [gatewayToken, setGatewayToken] = useState<string | undefined>(
    undefined,
  );
  const [mainSessionKey, setMainSessionKey] = useState<string | undefined>(
    undefined,
  );
  const [workspaceRoot, setWorkspaceRoot] = useState<string | undefined>(
    undefined,
  );

  const [gatewayUrlError, setGatewayUrlError] = useState<string | null>(null);
  const [gatewayCheckStatus, setGatewayCheckStatus] =
    useState<GatewayCheckStatus>("idle");
  const [gatewayCheckMessage, setGatewayCheckMessage] = useState<string | null>(
    null,
  );

  const [error, setError] = useState<string | null>(null);

  const gatewayQuery = useGetGatewayApiV1GatewaysGatewayIdGet<
    getGatewayApiV1GatewaysGatewayIdGetResponse,
    ApiError
  >(gatewayId ?? "", {
    query: {
      enabled: Boolean(isSignedIn && isAdmin && gatewayId),
      refetchOnMount: "always",
      retry: false,
    },
  });

  const updateMutation = useUpdateGatewayApiV1GatewaysGatewayIdPatch<ApiError>({
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

  const loadedGateway =
    gatewayQuery.data?.status === 200 ? gatewayQuery.data.data : null;
  const resolvedName = name ?? loadedGateway?.name ?? "";
  const resolvedGatewayUrl = gatewayUrl ?? loadedGateway?.url ?? "";
  const resolvedGatewayToken = gatewayToken ?? loadedGateway?.token ?? "";
  const resolvedMainSessionKey =
    mainSessionKey ??
    loadedGateway?.main_session_key ??
    DEFAULT_MAIN_SESSION_KEY;
  const resolvedWorkspaceRoot =
    workspaceRoot ?? loadedGateway?.workspace_root ?? DEFAULT_WORKSPACE_ROOT;

  const isLoading = gatewayQuery.isLoading || updateMutation.isPending;
  const errorMessage = error ?? gatewayQuery.error?.message ?? null;

  const canSubmit =
    Boolean(resolvedName.trim()) &&
    Boolean(resolvedGatewayUrl.trim()) &&
    Boolean(resolvedMainSessionKey.trim()) &&
    Boolean(resolvedWorkspaceRoot.trim()) &&
    gatewayCheckStatus === "success";

  const runGatewayCheck = async () => {
    const validationError = validateGatewayUrl(resolvedGatewayUrl);
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
      gatewayUrl: resolvedGatewayUrl,
      gatewayToken: resolvedGatewayToken,
      mainSessionKey: resolvedMainSessionKey,
    });
    setGatewayCheckStatus(ok ? "success" : "error");
    setGatewayCheckMessage(message);
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isSignedIn || !gatewayId) return;

    if (!resolvedName.trim()) {
      setError("Gateway name is required.");
      return;
    }
    const gatewayValidation = validateGatewayUrl(resolvedGatewayUrl);
    setGatewayUrlError(gatewayValidation);
    if (gatewayValidation) {
      setGatewayCheckStatus("error");
      setGatewayCheckMessage(gatewayValidation);
      return;
    }
    if (!resolvedMainSessionKey.trim()) {
      setError("Main session key is required.");
      return;
    }
    if (!resolvedWorkspaceRoot.trim()) {
      setError("Workspace root is required.");
      return;
    }

    setError(null);

    const payload: GatewayUpdate = {
      name: resolvedName.trim(),
      url: resolvedGatewayUrl.trim(),
      token: resolvedGatewayToken.trim() || null,
      main_session_key: resolvedMainSessionKey.trim(),
      workspace_root: resolvedWorkspaceRoot.trim(),
    };

    updateMutation.mutate({ gatewayId, data: payload });
  };

  return (
    <DashboardShell>
      <SignedOut>
        <SignedOutPanel
          message="Sign in to edit a gateway."
          forceRedirectUrl={`/gateways/${gatewayId}/edit`}
        />
      </SignedOut>
      <SignedIn>
        <DashboardSidebar />
        <main className="flex-1 overflow-y-auto bg-slate-50">
          <div className="border-b border-slate-200 bg-white px-8 py-6">
            <div>
              <h1 className="font-heading text-2xl font-semibold text-slate-900 tracking-tight">
                {resolvedName.trim()
                  ? `Edit gateway — ${resolvedName.trim()}`
                  : "Edit gateway"}
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Update connection settings for this OpenClaw gateway.
              </p>
            </div>
          </div>

          <div className="p-8">
            {!isAdmin ? (
              <AdminOnlyNotice message="Only organization owners and admins can edit gateways." />
            ) : (
              <GatewayForm
                name={resolvedName}
                gatewayUrl={resolvedGatewayUrl}
                gatewayToken={resolvedGatewayToken}
                mainSessionKey={resolvedMainSessionKey}
                workspaceRoot={resolvedWorkspaceRoot}
                gatewayUrlError={gatewayUrlError}
                gatewayCheckStatus={gatewayCheckStatus}
                gatewayCheckMessage={gatewayCheckMessage}
                errorMessage={errorMessage}
                isLoading={isLoading}
                canSubmit={canSubmit}
                mainSessionKeyPlaceholder={DEFAULT_MAIN_SESSION_KEY}
                workspaceRootPlaceholder={DEFAULT_WORKSPACE_ROOT}
                cancelLabel="Back"
                submitLabel="Save changes"
                submitBusyLabel="Saving…"
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

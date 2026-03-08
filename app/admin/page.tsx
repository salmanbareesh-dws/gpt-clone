"use client";

import { ModelSettingsSection } from "./_components/ModelSettingsSection";
import { OAuthModal } from "./_components/OAuthModal";
import { StatsGrid } from "./_components/StatsGrid";
import { UserManagementSection } from "./_components/UserManagementSection";
import { WorkspaceConnectionSection } from "./_components/WorkspaceConnectionSection";
import { useAdminPage } from "./use-admin-page";

export default function AdminPage() {
  const adminPage = useAdminPage();

  return (
    <main className="admin-layout">
      <div className="admin-card">
        <div className="admin-header">
          <h1>Admin control center</h1>
          <a className="btn secondary" href="/chat">
            Back to chat
          </a>
        </div>

        <WorkspaceConnectionSection
          oauth={adminPage.oauth}
          cliProviders={adminPage.cliProviders}
          providerError={adminPage.providerError}
          onOpenOAuthModal={adminPage.openOAuthModal}
          onDisconnectOAuth={adminPage.disconnectOAuth}
          onConnectCliProvider={adminPage.connectCliProvider}
          onDisconnectCliProvider={adminPage.disconnectCliProvider}
        />

        <OAuthModal
          open={adminPage.showOAuthModal}
          step={adminPage.oauthStep}
          deviceCode={adminPage.deviceCode}
          codexHomePath={adminPage.codexHomePath}
          error={adminPage.oauthError}
          onClose={adminPage.closeOAuthModal}
          onReset={() => adminPage.setOauthStep("idle")}
          onImportFromCodex={adminPage.importFromCodex}
          onStartCodexPopupOAuth={adminPage.startCodexPopupOAuth}
          onStartBrowserOAuth={adminPage.startBrowserOAuth}
        />

        <ModelSettingsSection
          oauth={adminPage.oauth}
          selectedDefault={adminPage.selectedDefault}
          newModel={adminPage.newModel}
          onUpdateDefaultModel={adminPage.updateDefaultModel}
          onNewModelChange={adminPage.setNewModel}
          onAddModel={adminPage.addModel}
          onRemoveModel={adminPage.removeModel}
        />

        <hr className="divider" />

        <StatsGrid stats={adminPage.stats} />

        <UserManagementSection
          users={adminPage.users}
          pendingUsers={adminPage.pendingUsers}
          email={adminPage.email}
          password={adminPage.password}
          role={adminPage.role}
          error={adminPage.error}
          onEmailChange={adminPage.setEmail}
          onPasswordChange={adminPage.setPassword}
          onRoleChange={adminPage.setRole}
          onCreateUser={adminPage.createUser}
          onUpdateStatus={adminPage.updateStatus}
        />
      </div>
    </main>
  );
}
